declare module 'jest-axe' {
  export interface AxeResults {
    violations: Array<{
      id: string;
      impact: string;
      tags: string[];
      description: string;
      help: string;
      helpUrl: string;
      nodes: Array<{
        html: string;
        target: string[];
        failureSummary: string;
      }>;
    }>;
    passes: Array<{
      id: string;
      impact: string;
      tags: string[];
      description: string;
      help: string;
      helpUrl: string;
      nodes: Array<{
        html: string;
        target: string[];
      }>;
    }>;
    inapplicable: Array<{
      id: string;
      impact: string;
      tags: string[];
      description: string;
      help: string;
      helpUrl: string;
      nodes: Array<{
        html: string;
        target: string[];
      }>;
    }>;
    incomplete: Array<{
      id: string;
      impact: string;
      tags: string[];
      description: string;
      help: string;
      helpUrl: string;
      nodes: Array<{
        html: string;
        target: string[];
        failureSummary: string;
      }>;
    }>;
    timestamp: string;
    url: string;
  }

  export function axe(
    element: Element | Document | null,
    options?: any,
    context?: any
  ): Promise<AxeResults>;

  export function toHaveNoViolations(): jest.CustomMatcherResult;
}

