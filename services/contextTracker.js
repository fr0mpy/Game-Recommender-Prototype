// Dynamic in-memory context tracking - no static files needed

// Holiday and special event definitions for EU
const HOLIDAYS = {
  // Major EU holidays that affect casino gaming
  'new-years': { start: '01-01', end: '01-02', themes: ['Celebration', 'Champagne', 'Party'] },
  'valentines': { start: '02-13', end: '02-15', themes: ['Romance', 'Love', 'Hearts'] },
  'st-patricks': { start: '03-16', end: '03-18', themes: ['Irish', 'Luck', 'Green'] },
  'easter': { start: '03-29', end: '04-01', themes: ['Spring', 'Rebirth', 'Animals'] }, // Varies by year
  'europe-day': { start: '05-08', end: '05-10', themes: ['Unity', 'European', 'Cultural'] },
  'midsummer': { start: '06-20', end: '06-24', themes: ['Summer', 'Nordic', 'Nature'] },
  'bastille-day': { start: '07-13', end: '07-15', themes: ['French', 'Revolution', 'Fireworks'] },
  'oktoberfest': { start: '09-16', end: '10-03', themes: ['German', 'Beer', 'Celebration'] },
  'halloween': { start: '10-29', end: '11-01', themes: ['Horror', 'Dark', 'Spooky'] },
  'guy-fawkes': { start: '11-04', end: '11-06', themes: ['British', 'Bonfire', 'Fireworks'] },
  'christmas': { start: '12-20', end: '12-26', themes: ['Christmas', 'Winter', 'Gifts'] },
  'boxing-day': { start: '12-26', end: '12-27', themes: ['British', 'Holiday', 'Boxing'] },
  'new-years-eve': { start: '12-30', end: '01-02', themes: ['Celebration', 'Party', 'Champagne'] }
};

// Sports seasons that might influence cross-sell (EU focused)
const SPORTS_SEASONS = {
  'premier-league': { months: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5], peak: [12, 1, 2, 3, 4] },
  'champions-league': { months: [9, 10, 11, 12, 2, 3, 4, 5], peak: [2, 3, 4, 5] },
  'euros': { months: [6, 7], peak: [6, 7] }, // Every 4 years
  'world-cup': { months: [11, 12], peak: [11, 12] }, // Every 4 years (Qatar timing)
  'formula-1': { months: [3, 4, 5, 6, 7, 8, 9, 10, 11], peak: [6, 7, 8, 9] },
  'rugby-six-nations': { months: [2, 3], peak: [2, 3] },
  'wimbledon': { months: [7], peak: [7] },
  'tour-de-france': { months: [7], peak: [7] }
};

class ContextTracker {
  constructor() {
    this.contexts = this.loadContexts();
  }

  // Create or update player context
  trackPlayerContext(sessionId, contextData) {
    const timestamp = new Date().toISOString();
    const context = {
      sessionId,
      timestamp,
      ...contextData,
      temporal: this.getTemporalContext(),
      confidence: this.calculateContextConfidence(contextData)
    };

    this.contexts[sessionId] = context;
    return context;
  }

  // Get current temporal context (holidays, seasons, etc.)
  getTemporalContext(timezone = null) {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-based
    const day = now.getDate();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0=Sunday
    
    // Get locale-aware time information
    const localeTime = this.getLocaleTimeInfo(now, timezone);
    
    const monthDay = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    return {
      currentTime: {
        month,
        day,
        hour,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isEvening: hour >= 17 && hour <= 23,
        isLateNight: hour >= 0 && hour <= 4,
        localeInfo: localeTime
      },
      activeHolidays: this.getActiveHolidays(monthDay),
      sportsSeason: this.getActiveSportsSeason(month),
      playTimeContext: this.getPlayTimeContext(hour, dayOfWeek)
    };
  }

  // Get locale-aware time and day information
  getLocaleTimeInfo(now, timezone = null) {
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    if (timezone) {
      options.timeZone = timezone;
    }

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const formattedParts = formatter.formatToParts(now);
    
    const dateTime = formatter.format(now);
    const dayName = formattedParts.find(part => part.type === 'weekday')?.value || 'Unknown';
    const monthName = formattedParts.find(part => part.type === 'month')?.value || 'Unknown';
    const timeString = `${formattedParts.find(part => part.type === 'hour')?.value || '0'}:${formattedParts.find(part => part.type === 'minute')?.value || '00'} ${formattedParts.find(part => part.type === 'dayPeriod')?.value || 'AM'}`;

    return {
      fullDateTime: dateTime,
      dayName,
      monthName,
      timeString,
      timezone: timezone || 'Local',
      timestamp: now.toISOString()
    };
  }

  // Detect active holidays
  getActiveHolidays(monthDay) {
    const active = [];
    for (const [name, holiday] of Object.entries(HOLIDAYS)) {
      if (this.isDateInRange(monthDay, holiday.start, holiday.end)) {
        active.push({
          name,
          themes: holiday.themes,
          weight: this.getHolidayWeight(name)
        });
      }
    }
    return active;
  }

  // Get active sports seasons
  getActiveSportsSeason(month) {
    const active = [];
    for (const [sport, season] of Object.entries(SPORTS_SEASONS)) {
      if (season.months.includes(month)) {
        active.push({
          sport,
          intensity: season.peak.includes(month) ? 'peak' : 'regular'
        });
      }
    }
    return active;
  }

  // Determine play time context
  getPlayTimeContext(hour, dayOfWeek) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    if (hour >= 9 && hour <= 17 && !isWeekend) {
      return { type: 'work-hours', intensity: 'low', description: 'Workday casual play' };
    } else if (hour >= 17 && hour <= 23) {
      return { type: 'evening', intensity: 'high', description: 'Prime gaming time' };
    } else if (hour >= 0 && hour <= 4) {
      return { type: 'late-night', intensity: 'medium', description: 'Late night session' };
    } else if (isWeekend && hour >= 10 && hour <= 16) {
      return { type: 'weekend-day', intensity: 'high', description: 'Weekend leisure time' };
    } else {
      return { type: 'off-peak', intensity: 'medium', description: 'Off-peak play' };
    }
  }

  // Calculate context confidence based on available data
  calculateContextConfidence(contextData) {
    let confidence = 0.3; // Base confidence
    const factors = [];

    // Referrer information
    if (contextData.referrer) {
      if (contextData.referrer.includes('ballysports') || contextData.referrer.includes('bally')) {
        confidence += 0.25;
        factors.push('Bally Sports referrer');
      } else if (contextData.referrer.includes('google') || contextData.referrer.includes('search')) {
        confidence += 0.15;
        factors.push('Search engine referrer');
      } else {
        confidence += 0.1;
        factors.push('External referrer');
      }
    }

    // Session history
    if (contextData.sessionCount > 1) {
      confidence += Math.min(contextData.sessionCount * 0.05, 0.2);
      factors.push(`${contextData.sessionCount} previous sessions`);
    }

    // Geographic/timezone data
    if (contextData.timezone) {
      confidence += 0.1;
      factors.push('Timezone data available');
    }

    // User agent/device info
    if (contextData.userAgent) {
      confidence += 0.05;
      if (contextData.userAgent.includes('Mobile')) {
        factors.push('Mobile device');
      } else {
        factors.push('Desktop device');
      }
    }

    // Bally's ecosystem data
    if (contextData.ballysSports) {
      confidence += 0.2;
      factors.push('Ballys Sports data available');
    }

    // Cookie/localStorage data
    if (contextData.hasStoredPreferences) {
      confidence += 0.15;
      factors.push('Stored preferences found');
    }

    return {
      score: Math.min(confidence, 1.0),
      factors,
      level: confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low'
    };
  }

  // Detect Bally's Sports cross-sell opportunities
  detectBallysSportsCrossSell(contextData) {
    const crossSellData = {
      eligible: false,
      confidence: 0,
      recommendations: [],
      factors: []
    };

    // Check referrer
    if (contextData.referrer && contextData.referrer.includes('ballysports')) {
      crossSellData.eligible = true;
      crossSellData.confidence += 0.4;
      crossSellData.factors.push('Referred from Bally Sports');
    }

    // Check for sports betting cookies/storage
    if (contextData.ballysSports) {
      crossSellData.eligible = true;
      crossSellData.confidence += 0.3;
      crossSellData.factors.push('Bally Sports account detected');
      
      if (contextData.ballysSports.recentBets) {
        crossSellData.confidence += 0.2;
        crossSellData.factors.push('Recent sports betting activity');
      }
    }

    // Sports season context
    const temporal = this.getTemporalContext();
    if (temporal.sportsSeason.length > 0) {
      crossSellData.confidence += 0.1;
      crossSellData.factors.push(`Active ${temporal.sportsSeason.map(s => s.sport).join(', ')} season`);
      
      // Recommend sports-themed games
      temporal.sportsSeason.forEach(season => {
        crossSellData.recommendations.push({
          type: 'sports-theme',
          sport: season.sport,
          intensity: season.intensity,
          message: `Try our ${season.sport.toUpperCase()} themed slots during ${season.sport} season!`
        });
      });
    }

    return crossSellData;
  }

  // Get player context for recommendations
  getPlayerContext(sessionId) {
    return this.contexts[sessionId] || null;
  }

  // Helper methods
  isDateInRange(current, start, end) {
    // Handle year-end rollover (e.g., Dec 30 - Jan 2)
    if (start > end) {
      return current >= start || current <= end;
    }
    return current >= start && current <= end;
  }

  getHolidayWeight(holidayName) {
    const weights = {
      'christmas': 0.8,
      'halloween': 0.7,
      'new-years': 0.6,
      'st-patricks': 0.5,
      'valentines': 0.4
    };
    return weights[holidayName] || 0.3;
  }

  // In-memory persistence methods (no files needed)
  loadContexts() {
    // Always start fresh - contexts are session-based and dynamic
    return {};
  }

  saveContexts() {
    // No-op - contexts are kept in memory only
    // In production, this could write to Redis, database, etc.
  }

  // Generate LLM summary of player context for recommendations
  async generateContextSummary(playerContext) {
    const Anthropic = require('@anthropic-ai/sdk');
    
    if (!process.env.ANTHROPIC_API_KEY) {
      return this.generateBasicContextSummary(playerContext);
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
      const contextData = {
        confidence: playerContext.confidence,
        temporal: playerContext.temporal,
        device: playerContext.deviceType,
        referrer: playerContext.referrer,
        timezone: playerContext.timezone
      };

      const prompt = `Analyze this player context and provide a brief recommendation insight:

PLAYER CONTEXT:
- Confidence Level: ${contextData.confidence?.level || 'unknown'} (${Math.round((contextData.confidence?.score || 0) * 100)}%)
- Time: ${contextData.temporal?.currentTime?.localeInfo?.fullDateTime || 'Unknown time'}
- Device: ${contextData.device || 'Unknown'}
- Referrer: ${contextData.referrer || 'Direct visit'}
- Timezone: ${contextData.timezone || 'Unknown'}

TEMPORAL FACTORS:
- ${contextData.temporal?.currentTime?.isWeekend ? 'Weekend' : 'Weekday'} ${contextData.temporal?.playTimeContext?.description || ''}
- Active Holidays: ${contextData.temporal?.activeHolidays?.map(h => h.name).join(', ') || 'None'}
- Sports Seasons: ${contextData.temporal?.sportsSeason?.map(s => s.sport.toUpperCase()).join(', ') || 'None active'}

CONFIDENCE FACTORS:
${contextData.confidence?.factors?.map(f => `- ${f}`).join('\n') || '- Basic session data only'}

Provide a 1-2 sentence summary of what this context means for game recommendations, focusing on the most relevant factors for personalizing slot game suggestions.`;

      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 150,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0]?.text?.trim() || this.generateBasicContextSummary(playerContext);

    } catch (error) {
      console.error('Error generating context summary:', error);
      return this.generateBasicContextSummary(playerContext);
    }
  }

  generateBasicContextSummary(playerContext) {
    const factors = [];
    
    if (playerContext.temporal?.currentTime?.isWeekend) {
      factors.push('weekend leisure time');
    } else if (playerContext.temporal?.currentTime?.isEvening) {
      factors.push('evening gaming session');
    }
    
    if (playerContext.temporal?.activeHolidays?.length > 0) {
      factors.push(`${playerContext.temporal.activeHolidays[0].name.replace('-', ' ')} season`);
    }
    
    if (playerContext.temporal?.sportsSeason?.length > 0) {
      factors.push(`${playerContext.temporal.sportsSeason[0].sport} season`);
    }
    
    if (playerContext.referrer?.includes('ballysports')) {
      factors.push('sports betting crossover opportunity');
    }
    
    if (factors.length === 0) {
      return 'Standard gaming session with basic personalization available based on device and timing preferences.';
    }
    
    return `Optimal timing for recommendations emphasizing ${factors.slice(0, 2).join(' and ')} themes and mechanics.`;
  }

  // Clean up old contexts (keep last 30 days)
  cleanupOldContexts() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let cleaned = 0;

    for (const [sessionId, context] of Object.entries(this.contexts)) {
      if (new Date(context.timestamp) < thirtyDaysAgo) {
        delete this.contexts[sessionId];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old player contexts from memory`);
    }
  }
}

module.exports = new ContextTracker();