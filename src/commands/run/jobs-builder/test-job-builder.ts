import { ParamsResult } from '../questions/param-questions.model';
import { Project } from '../questions/project-questions';
import { JobDescriptor } from './models';

interface TestJobParams {
  env: string;
  branch: string;
  querystring: string;
  'fandom-env': string;
  extension: string;
  'custom-name': string;
  'tabs-to-trigger': string;
}

export class TestJobBuilder {
  private projectNameMap = new Map<Project, string>([
    ['app', 'ads-app-preview'],
    ['mobile-wiki', 'ads-mobile-wiki-preview'],
    ['f2', 'ads-news-and-stories-prod'],
    ['ucp-desktop', 'ads-ucp-desktop'],
    ['ucp-mobile', 'ads-ucp-mobile'],
  ]);

  build(projects: Project[], params: ParamsResult): JobDescriptor[] {
    const result: JobDescriptor = {
      displayName: projects.filter(project => this.projectNameMap.has(project)).join(', ') as any,
      opts: {
        name: 'ads-synthetic-run',
        parameters: this.mapParams(projects, params),
      },
    };

    return [result];
  }

  private mapParams(projects: Project[], params: ParamsResult): TestJobParams {
    return {
      env: params.sandbox,
      branch: params.testBranch,
      querystring: params.query,
      'fandom-env': params.fandomEnvironment,
      extension: params.extension,
      'custom-name': params.name,
      'tabs-to-trigger': this.mapTagsToTrigger(projects),
    };
  }

  private mapTagsToTrigger(projects: Project[]): string {
    return projects
      .map((project: Project) => this.projectNameMap.get(project))
      .filter((value: string) => !!value)
      .join(' ');
  }
}
