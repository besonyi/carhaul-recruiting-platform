import { staffData } from '../../lib/api';
import { Pipeline, type PipelineData } from './pipeline';

export default async function RecruitingPage() {
  const data = await staffData<PipelineData>('/candidates');
  return <Pipeline initial={data} />;
}
