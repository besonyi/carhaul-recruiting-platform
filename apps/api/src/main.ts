import 'reflect-metadata';
import {
  BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, HttpCode,
  HttpException, Module, NotFoundException, Param, Patch, Post, Query, Req, ServiceUnavailableException, UnauthorizedException,
} from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { JobStatus, Prisma, Role, Stage, Track } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { carrier, db, notice, quickApplyEnabled } from './config';
import { applicationInput, assignmentInput, followUpInput, jobInput, noteInput, staffLogin, stageInput, uuid } from './domain';
import { draftAnswers, extendedAnswers, extendedProfileFields, extendedSubmission, invitationFor, issueInvitation, revokeInvitation, writeExtended } from './extended-application';
import { redis, withinLimit } from './integrations';
import { sessionHash, sessionToken, verifyPassword } from './security';

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException(result.error.issues.map(issue =>
    [issue.path.join('.'), issue.message].filter(Boolean).join(': ')));
  return result.data;
}

const tokenFrom = (req: Request) => req.headers.authorization?.match(/^Bearer ([\w-]{43})$/)?.[1];
async function staff(req: Request, role?: Role) {
  const token = tokenFrom(req);
  if (!token) throw new UnauthorizedException();
  const session = await db.session.findUnique({ where: { hash: sessionHash(token) }, include: { staff: true } });
  if (!session || session.expiresAt <= new Date() || !session.staff.active) throw new UnauthorizedException();
  if (role && session.staff.role !== role) throw new ForbiddenException();
  return { id: session.staffId, role: session.staff.role };
}

async function throttle(key: string, limit: number, seconds: number) {
  let allowed;
  try { allowed = await withinLimit(key, limit, seconds); }
  catch { throw new ServiceUnavailableException('Please try again shortly.'); }
  if (!allowed) throw new HttpException('Too many attempts. Please try again later.', 429);
}

const jobTrack = z.enum(Track);
const publicJob = {
  id: true, slug: true, title: true, region: true, track: true, requirements: true,
  schedule: true, equipment: true, compensation: true,
} satisfies Prisma.JobSelect;

@Controller()
class PublicController {
  @Get('site') site() {
    return { carrier, notice: quickApplyEnabled ? notice : null };
  }

  @Get('jobs') jobs(@Query('track') track?: string, @Query('region') region?: string) {
    return db.job.findMany({
      where: {
        status: JobStatus.PUBLISHED,
        track: track ? parse(jobTrack, track) : undefined,
        region: region ? { contains: parse(z.string().max(120), region), mode: 'insensitive' } : undefined,
      },
      select: publicJob, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 100,
    });
  }

  @Get('jobs/:slug') async job(@Param('slug') slug: string) {
    const job = await db.job.findFirst({ where: { slug, status: JobStatus.PUBLISHED }, select: publicJob });
    if (!job) throw new NotFoundException();
    return job;
  }

  @Post('applications') async apply(@Req() req: Request, @Body() input: unknown) {
    if (!quickApplyEnabled) throw new ServiceUnavailableException('Quick Apply is currently unavailable.');
    await throttle('apply:' + req.ip, 10, 900);
    const { name, email, phone, state, zip, track, jobId, accepted, noticeVersion, ...details } = parse(applicationInput, input);
    if (noticeVersion !== notice.version) throw new ConflictException('The consent notice changed. Reload the form and review it again.');

    await db.$transaction(async tx => {
      if (jobId) {
        // Serialize publication changes with submissions targeting this posting.
        const jobs = await tx.$queryRaw<{ status: JobStatus; track: Track }[]>
          `SELECT "status", "track" FROM "Job" WHERE id = ${jobId} FOR SHARE`;
        if (jobs[0]?.status !== JobStatus.PUBLISHED || jobs[0].track !== track) {
          throw new BadRequestException('This posting is unavailable for the selected application.');
        }
      }
      await tx.candidate.createMany({ data: [{ name, email, phone, state, zip, track }], skipDuplicates: true });
      const candidate = await tx.candidate.findUniqueOrThrow({ where: { phone_track: { phone, track } } });
      const application = await tx.application.create({
        data: {
          candidateId: candidate.id, jobId,
          details: { ...details, name, email, phone, state, zip },
          consent: { create: { version: notice.version, statement: notice.statement + '\n\n' + notice.agreement } },
        },
      });
      await tx.audit.create({
        data: { action: 'application.received', subjectId: application.id, candidateId: candidate.id },
      });
    });
    return { received: true };
  }

  @Get('applications/extended') async extendedContext(@Req() req: Request) {
    const { candidate, invitationId, expiresAt, revision, draft, draftSavedAt } = await invitationFor(tokenFrom(req));
    return { track: candidate.track, invitationId, expiresAt, revision, draft, draftSavedAt };
  }

  @Patch('applications/extended') saveExtendedDraft(@Req() req: Request, @Body() input: unknown) {
    return this.updateExtended(req, input, 'draft');
  }

  @Post('applications/extended') submitExtendedApplication(@Req() req: Request, @Body() input: unknown) {
    return this.updateExtended(req, input, 'submit');
  }

  private async updateExtended(req: Request, input: unknown, intent: 'draft' | 'submit') {
    const invitation = await invitationFor(tokenFrom(req));
    const envelope = parse(extendedSubmission, input);
    if (invitation.invitationId !== envelope.invitationId) throw new ConflictException('The active invitation changed. Reopen your link before submitting.');
    const schema = (intent === 'draft' ? draftAnswers : extendedAnswers)[invitation.candidate.track];
    const answers = parse<Prisma.InputJsonObject>(schema, envelope.answers);
    return writeExtended(invitation, envelope.revision, answers, intent);
  }
}

const dummyHash = '0'.repeat(32) + ':' + '0'.repeat(128);
@Controller('crm')
class CrmController {
  @Post('login') @HttpCode(200) async login(@Req() req: Request, @Body() input: unknown) {
    await throttle('login:ip:' + req.ip, 30, 900);
    const { email, password } = parse(staffLogin, input);
    const normalized = email.toLowerCase();
    await throttle('login:account:' + sessionHash(normalized), 8, 900);
    const account = await db.staff.findUnique({ where: { email: normalized } });
    const valid = await verifyPassword(password, account?.passwordHash ?? dummyHash);
    if (!account?.active || !valid) throw new UnauthorizedException('Invalid email or password.');
    const token = sessionToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await db.$transaction([
      db.session.deleteMany({ where: { staffId: account.id, expiresAt: { lte: new Date() } } }),
      db.session.create({ data: { hash: sessionHash(token), staffId: account.id, expiresAt } }),
      db.audit.create({ data: { action: 'staff.login', subjectId: account.id, actorId: account.id } }),
    ]);
    return { token, expiresAt };
  }

  @Post('logout') @HttpCode(204) async logout(@Req() req: Request) {
    const token = tokenFrom(req);
    if (token) await db.session.deleteMany({ where: { hash: sessionHash(token) } });
  }

  @Get('me') me(@Req() req: Request) { return staff(req); }

  @Get('staff') async users(@Req() req: Request) {
    await staff(req);
    return db.staff.findMany({ where: { active: true }, select: { id: true, email: true }, orderBy: { email: 'asc' } });
  }

  @Get('jobs') async jobs(@Req() req: Request) {
    await staff(req, Role.ADMIN);
    return db.job.findMany({ orderBy: { updatedAt: 'desc' } });
  }

  @Post('jobs') async createJob(@Req() req: Request, @Body() input: unknown) {
    const actor = await staff(req, Role.ADMIN);
    const data = parse(jobInput, input);
    return this.writeJob(actor.id, data);
  }

  @Patch('jobs/:id') async updateJob(@Req() req: Request, @Param('id') id: string, @Body() input: unknown) {
    const actor = await staff(req, Role.ADMIN);
    return this.writeJob(actor.id, parse(jobInput, input), parse(uuid, id));
  }

  private async writeJob(actorId: string, data: z.infer<typeof jobInput>, id?: string) {
    try {
      return await db.$transaction(async tx => {
        const job = id ? await tx.job.update({ where: { id }, data }) : await tx.job.create({ data });
        await tx.audit.create({ data: { actorId, action: id ? 'job.updated' : 'job.created', subjectId: job.id, data: { status: job.status } } });
        return job;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new ConflictException('This job URL is already used.');
        if (error.code === 'P2025') throw new NotFoundException();
      }
      throw error;
    }
  }

  @Get('candidates') candidates(@Req() req: Request) {
    return this.listCandidates(req, {});
  }

  @Post('candidates/search') @HttpCode(200) search(@Req() req: Request, @Body() input: unknown) {
    return this.listCandidates(req, input);
  }

  private async listCandidates(req: Request, input: unknown) {
    await staff(req);
    const { q, track, page } = parse(z.object({
      q: z.string().trim().max(120).optional(), track: jobTrack.optional(),
      page: z.coerce.number().int().min(1).max(10000).default(1),
    }), input);
    const where: Prisma.CandidateWhereInput = {
      track, OR: q ? [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { state: { equals: q.toUpperCase() } },
      ] : undefined,
    };
    const [counts, candidates] = await db.$transaction(async tx => {
      const counts = await tx.candidate.groupBy({ by: ['stage'], where, _count: { _all: true } });
      const candidates = await tx.candidate.findMany({
        where, select: { id: true, name: true, track: true, state: true, stage: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], skip: (page - 1) * 50, take: 50,
      });
      return [counts, candidates] as const;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { candidates, counts: Object.fromEntries(counts.map(item => [item.stage, item._count._all])) };
  }

  @Get('candidates/:id') async profile(@Req() req: Request, @Param('id') id: string) {
    await staff(req);
    const candidate = await db.candidate.findUnique({
      where: { id: parse(uuid, id) },
      include: {
        applications: { orderBy: { createdAt: 'desc' }, include: { consent: true, job: { select: { title: true } } } },
        extendedApplication: { select: extendedProfileFields },
        notes: { orderBy: { createdAt: 'desc' } },
        followUps: { orderBy: [
          { completedAt: { sort: 'asc', nulls: 'first' } }, { canceledAt: { sort: 'asc', nulls: 'first' } },
          { dueAt: 'asc' }, { id: 'asc' },
        ] },
        audit: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!candidate) throw new NotFoundException();
    return candidate;
  }

  @Post('candidates/:id/invitation') async invite(@Req() req: Request, @Param('id') rawId: string) {
    const actor = await staff(req);
    return issueInvitation(parse(uuid, rawId), actor.id);
  }

  @Patch('candidates/:id/invitation') @HttpCode(204) async revokeInvite(@Req() req: Request, @Param('id') rawId: string) {
    const actor = await staff(req);
    await revokeInvitation(parse(uuid, rawId), actor.id);
  }

  @Patch('candidates/:id/stage') async stage(@Req() req: Request, @Param('id') rawId: string, @Body() input: unknown) {
    const actor = await staff(req);
    const id = parse(uuid, rawId);
    const { previous, stage, reason } = parse(stageInput, input);
    await db.$transaction(async tx => {
      const result = await tx.candidate.updateMany({ where: { id, stage: previous }, data: { stage, stageReason: reason || null } });
      if (!result.count) throw new ConflictException('Candidate changed. Reload the page before updating.');
      await tx.audit.create({ data: { actorId: actor.id, candidateId: id, subjectId: id, action: 'candidate.stageChanged', data: { previous, stage, reason: reason || null } } });
    });
    return { updated: true };
  }

  @Patch('candidates/:id/assignment') async assign(@Req() req: Request, @Param('id') rawId: string, @Body() input: unknown) {
    const actor = await staff(req);
    const id = parse(uuid, rawId);
    const { recruiterId } = parse(assignmentInput, input);
    await db.$transaction(async tx => {
      if (recruiterId && !(await tx.staff.findFirst({ where: { id: recruiterId, active: true } }))) {
        throw new BadRequestException('Select an active staff member.');
      }
      const updated = await tx.candidate.updateMany({ where: { id }, data: { recruiterId } });
      if (!updated.count) throw new NotFoundException();
      await tx.audit.create({ data: { actorId: actor.id, candidateId: id, subjectId: id, action: 'candidate.assigned', data: { recruiterId } } });
    });
    return { updated: true };
  }

  @Post('candidates/:id/notes') async addNote(@Req() req: Request, @Param('id') rawId: string, @Body() input: unknown) {
    const actor = await staff(req);
    const id = parse(uuid, rawId);
    const { body } = parse(noteInput, input);
    await db.$transaction(async tx => {
      if (!(await tx.candidate.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException();
      const note = await tx.note.create({ data: { candidateId: id, authorId: actor.id, body } });
      await tx.audit.create({ data: { actorId: actor.id, candidateId: id, subjectId: note.id, action: 'candidate.noteAdded' } });
    });
    return { added: true };
  }

  @Get('follow-ups') async myFollowUps(@Req() req: Request, @Query('page') rawPage?: string) {
    const actor = await staff(req);
    const page = parse(z.coerce.number().int().min(1).max(10000).default(1), rawPage);
    const items = await db.followUp.findMany({
      where: { assigneeId: actor.id, completedAt: null, canceledAt: null },
      select: {
        id: true, title: true, dueAt: true,
        candidate: { select: { id: true, name: true } },
      },
      orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * 50, take: 51,
    });
    return { items: items.slice(0, 50), hasNext: items.length > 50 };
  }

  @Post('candidates/:id/follow-ups') async addFollowUp(@Req() req: Request, @Param('id') rawId: string, @Body() input: unknown) {
    const actor = await staff(req);
    const candidateId = parse(uuid, rawId);
    const data = parse(followUpInput, input);
    return db.$transaction(async tx => {
      if (!(await tx.candidate.findUnique({ where: { id: candidateId }, select: { id: true } }))) throw new NotFoundException();
      if (!(await tx.staff.findFirst({ where: { id: data.assigneeId, active: true }, select: { id: true } }))) {
        throw new BadRequestException('Select an active staff member.');
      }
      const followUp = await tx.followUp.create({ data: { ...data, candidateId }, select: { id: true } });
      await tx.audit.create({
        data: { actorId: actor.id, candidateId, subjectId: followUp.id, action: 'followUp.created', data: { assigneeId: data.assigneeId } },
      });
      return followUp;
    });
  }

  @Patch('candidates/:id/follow-ups/:followUpId') async closeFollowUp(
    @Req() req: Request, @Param('id') rawId: string, @Param('followUpId') rawFollowUpId: string,
    @Body() input: unknown,
  ) {
    const actor = await staff(req);
    const candidateId = parse(uuid, rawId);
    const id = parse(uuid, rawFollowUpId);
    const { action } = parse(z.strictObject({ action: z.enum(['complete', 'cancel']).default('complete') }), input ?? {});
    const dateField = action === 'complete' ? 'completedAt' : 'canceledAt';
    await db.$transaction(async tx => {
      const where = { id, candidateId };
      const updated = await tx.followUp.updateMany({
        where: { ...where, completedAt: null, canceledAt: null }, data: { [dateField]: new Date() },
      });
      if (!updated.count) {
        const item = await tx.followUp.findFirst({ where, select: { completedAt: true, canceledAt: true } });
        if (!item) throw new NotFoundException();
        if (!item[dateField]) throw new ConflictException('This follow-up has already been closed.');
        return;
      }
      await tx.audit.create({
        data: { actorId: actor.id, candidateId, subjectId: id, action: action === 'complete' ? 'followUp.completed' : 'followUp.canceled' },
      });
    });
    return { status: dateField === 'completedAt' ? 'completed' : 'canceled' };
  }
}

@Module({ controllers: [PublicController, CrmController] })
class RecruitingModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(RecruitingModule, { bodyParser: false, logger: ['log', 'warn'] });
  app.useBodyParser('json', { limit: '16kb' });
  app.use(helmet());
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  redis.on('error', () => {});
  app.setGlobalPrefix('api');
  await app.listen(Number(process.env.API_PORT || 4000), process.env.API_HOST || '127.0.0.1');
}

bootstrap().catch(() => { console.error('Could not start the recruiting API.'); process.exit(1); });
