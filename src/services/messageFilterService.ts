interface FilterRule {
  id: string;
  pattern: RegExp;
  type: 'email' | 'phone' | 'social' | 'website' | 'external_platform';
  severity: 'low' | 'medium' | 'high';
  action: 'flag' | 'block' | 'replace';
  replacement?: string;
  description: string;
}

interface FilterResult {
  isAllowed: boolean;
  filteredContent: string;
  violations: {
    type: string;
    match: string;
    severity: string;
    position: number;
  }[];
  requiresReview: boolean;
}

class MessageFilterService {
  private filterRules: FilterRule[] = [
    // Email patterns
    {
      id: 'email_basic',
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      type: 'email',
      severity: 'high',
      action: 'replace',
      replacement: '[EMAIL REMOVED - Please use platform messaging]',
      description: 'Email addresses'
    },
    
    // Phone patterns
    {
      id: 'phone_us',
      pattern: /(\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g,
      type: 'phone',
      severity: 'high',
      action: 'replace',
      replacement: '[PHONE REMOVED - Please use platform messaging]',
      description: 'Phone numbers'
    },
    
    // Social media patterns
    {
      id: 'instagram',
      pattern: /(?:instagram|insta|ig)[\s:@]*[a-zA-Z0-9._]+/gi,
      type: 'social',
      severity: 'medium',
      action: 'replace',
      replacement: '[SOCIAL MEDIA REMOVED - Please keep communication on platform]',
      description: 'Instagram handles'
    },
    
    {
      id: 'twitter',
      pattern: /(?:twitter|tweet)[\s:@]*[a-zA-Z0-9._]+/gi,
      type: 'social',
      severity: 'medium',
      action: 'replace',
      replacement: '[SOCIAL MEDIA REMOVED - Please keep communication on platform]',
      description: 'Twitter handles'
    },
    
    {
      id: 'facebook',
      pattern: /(?:facebook|fb)[\s:@]*[a-zA-Z0-9._]+/gi,
      type: 'social',
      severity: 'medium',
      action: 'replace',
      replacement: '[SOCIAL MEDIA REMOVED - Please keep communication on platform]',
      description: 'Facebook profiles'
    },
    
    {
      id: 'linkedin',
      pattern: /(?:linkedin)[\s:@]*[a-zA-Z0-9._]+/gi,
      type: 'social',
      severity: 'medium',
      action: 'replace',
      replacement: '[SOCIAL MEDIA REMOVED - Please keep communication on platform]',
      description: 'LinkedIn profiles'
    },
    
    // External platforms
    {
      id: 'skype',
      pattern: /(?:skype)[\s:@]*[a-zA-Z0-9._]+/gi,
      type: 'external_platform',
      severity: 'high',
      action: 'replace',
      replacement: '[EXTERNAL PLATFORM REMOVED - Please use our messaging system]',
      description: 'Skype usernames'
    },
    
    {
      id: 'discord',
      pattern: /(?:discord)[\s:@]*[a-zA-Z0-9._#]+/gi,
      type: 'external_platform',
      severity: 'high',
      action: 'replace',
      replacement: '[EXTERNAL PLATFORM REMOVED - Please use our messaging system]',
      description: 'Discord usernames'
    },
    
    {
      id: 'whatsapp',
      pattern: /(?:whatsapp|whats app)[\s:@]*[a-zA-Z0-9._+]+/gi,
      type: 'external_platform',
      severity: 'high',
      action: 'replace',
      replacement: '[EXTERNAL PLATFORM REMOVED - Please use our messaging system]',
      description: 'WhatsApp references'
    },
    
    {
      id: 'telegram',
      pattern: /(?:telegram)[\s:@]*[a-zA-Z0-9._]+/gi,
      type: 'external_platform',
      severity: 'high',
      action: 'replace',
      replacement: '[EXTERNAL PLATFORM REMOVED - Please use our messaging system]',
      description: 'Telegram usernames'
    },
    
    // Website patterns
    {
      id: 'website',
      pattern: /(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/g,
      type: 'website',
      severity: 'medium',
      action: 'flag',
      description: 'Website URLs'
    },
    
    // Contact solicitation patterns
    {
      id: 'contact_me',
      pattern: /contact\s+me\s+(?:at|on|via|through)/gi,
      type: 'external_platform',
      severity: 'medium',
      action: 'flag',
      description: 'Contact solicitation'
    },
    
    {
      id: 'reach_me',
      pattern: /reach\s+me\s+(?:at|on|via|through)/gi,
      type: 'external_platform',
      severity: 'medium',
      action: 'flag',
      description: 'Contact solicitation'
    },
    
    {
      id: 'find_me',
      pattern: /find\s+me\s+(?:at|on|via|through)/gi,
      type: 'external_platform',
      severity: 'medium',
      action: 'flag',
      description: 'Contact solicitation'
    }
  ];

  filterMessage(content: string): FilterResult {
    let filteredContent = content;
    const violations: FilterResult['violations'] = [];
    let requiresReview = false;

    for (const rule of this.filterRules) {
      const matches = Array.from(content.matchAll(rule.pattern));
      
      for (const match of matches) {
        violations.push({
          type: rule.type,
          match: match[0],
          severity: rule.severity,
          position: match.index || 0
        });

        if (rule.action === 'replace' && rule.replacement) {
          filteredContent = filteredContent.replace(rule.pattern, rule.replacement);
        }

        if (rule.severity === 'high' || rule.action === 'flag') {
          requiresReview = true;
        }
      }
    }

    const isAllowed = violations.length === 0 || !violations.some(v => v.severity === 'high');

    return {
      isAllowed,
      filteredContent,
      violations,
      requiresReview
    };
  }

  addCustomRule(rule: Omit<FilterRule, 'id'>): FilterRule {
    const newRule: FilterRule = {
      ...rule,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.filterRules.push(newRule);
    this.saveCustomRules();
    
    return newRule;
  }

  removeCustomRule(ruleId: string): boolean {
    const index = this.filterRules.findIndex(r => r.id === ruleId && r.id.startsWith('custom_'));
    if (index >= 0) {
      this.filterRules.splice(index, 1);
      this.saveCustomRules();
      return true;
    }
    return false;
  }

  getFilterRules(): FilterRule[] {
    return [...this.filterRules];
  }

  private saveCustomRules(): void {
    const customRules = this.filterRules.filter(r => r.id.startsWith('custom_'));
    localStorage.setItem('custom_filter_rules', JSON.stringify(customRules));
  }

  private loadCustomRules(): void {
    try {
      const customRules = JSON.parse(localStorage.getItem('custom_filter_rules') || '[]');
      this.filterRules.push(...customRules.map((rule: any) => ({
        ...rule,
        pattern: new RegExp(rule.pattern.source, rule.pattern.flags)
      })));
    } catch (error) {
      console.error('Failed to load custom filter rules:', error);
    }
  }

  // Initialize with custom rules
  constructor() {
    this.loadCustomRules();
  }

  // Get violation statistics
  getViolationStats(messages: any[]): any {
    const stats = {
      total: 0,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    for (const message of messages) {
      const result = this.filterMessage(message.content);
      if (result.violations.length > 0) {
        stats.total++;
        
        for (const violation of result.violations) {
          stats.byType[violation.type] = (stats.byType[violation.type] || 0) + 1;
          stats.bySeverity[violation.severity] = (stats.bySeverity[violation.severity] || 0) + 1;
        }
      }
    }

    return stats;
  }
}

export const messageFilterService = new MessageFilterService();
export type { FilterRule, FilterResult };