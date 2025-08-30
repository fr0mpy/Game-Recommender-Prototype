// Dynamic in-memory context tracking - no static files needed
const fs = require('fs');
const path = require('path');

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
  'premier-league': { months: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5], peak: [12, 1, 2, 3, 4], themes: ['Football', 'British', 'Competition'] },
  'champions-league': { months: [9, 10, 11, 12, 2, 3, 4, 5], peak: [2, 3, 4, 5], themes: ['European', 'Elite', 'Champions'] },
  'europa-league': { months: [9, 10, 11, 12, 2, 3, 4, 5], peak: [2, 3, 4, 5], themes: ['European', 'Competition', 'Rising Stars'] },
  'euros': { months: [6, 7], peak: [6, 7], themes: ['European', 'National Pride', 'Unity'] }, // Every 4 years
  'world-cup': { months: [11, 12], peak: [11, 12], themes: ['Global', 'National Pride', 'Football'] }, // Every 4 years
  'formula-1': { months: [3, 4, 5, 6, 7, 8, 9, 10, 11], peak: [6, 7, 8, 9], themes: ['Racing', 'Speed', 'Luxury'] },
  'rugby-six-nations': { months: [2, 3], peak: [2, 3], themes: ['Rugby', 'European', 'Tradition'] },
  'wimbledon': { months: [7], peak: [7], themes: ['Tennis', 'Tradition', 'British'] },
  'tour-de-france': { months: [7], peak: [7], themes: ['Cycling', 'Endurance', 'French'] },
  'bundesliga': { months: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5], peak: [12, 1, 2, 3, 4], themes: ['German Football', 'Precision', 'Efficiency'] },
  'la-liga': { months: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5], peak: [12, 1, 2, 3, 4], themes: ['Spanish Football', 'Passion', 'Technical'] },
  'serie-a': { months: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5], peak: [12, 1, 2, 3, 4], themes: ['Italian Football', 'Tactical', 'Style'] }
};

// Load prompt from file
function loadPrompt(filename) {
  try {
    const promptPath = path.join(__dirname, '..', 'prompts', filename);
    const content = fs.readFileSync(promptPath, 'utf8');
    
    // Extract the context tracker implementation template section
    const templateStart = content.indexOf('# Context Tracker Implementation Template');
    if (templateStart !== -1) {
      return content.substring(templateStart).replace('# Context Tracker Implementation Template\n\n', '');
    }
    
    return content;
  } catch (error) {
    console.error(`Failed to load prompt from ${filename}:`, error.message);
    return null;
  }
}

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
      playTimeContext: this.getPlayTimeContext(hour, dayOfWeek),
      season: this.getCurrentSeason(month),
      weather: this.getWeatherContext(month, day)
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
          intensity: season.peak.includes(month) ? 'peak' : 'regular',
          themes: season.themes || []
        });
      }
    }
    return active;
  }

  // Get current season
  getCurrentSeason(month) {
    // Northern Hemisphere seasons
    if (month >= 3 && month <= 5) return { name: 'spring', themes: ['Renewal', 'Growth', 'Fresh Start'] };
    if (month >= 6 && month <= 8) return { name: 'summer', themes: ['Vacation', 'Energy', 'Adventure'] };
    if (month >= 9 && month <= 11) return { name: 'autumn', themes: ['Harvest', 'Change', 'Cozy'] };
    return { name: 'winter', themes: ['Celebration', 'Reflection', 'Warmth'] };
  }

  // Get weather-influenced context
  getWeatherContext(month, day) {
    const season = this.getCurrentSeason(month);
    
    // Simulate weather patterns for context
    const weatherPatterns = {
      spring: { mood: 'optimistic', themes: ['Nature', 'Lucky', 'Fresh'] },
      summer: { mood: 'energetic', themes: ['Beach', 'Travel', 'Adventure'] },
      autumn: { mood: 'contemplative', themes: ['Harvest', 'Mystery', 'Traditional'] },
      winter: { mood: 'cozy', themes: ['Celebration', 'Magic', 'Warmth'] }
    };
    
    return weatherPatterns[season.name] || { mood: 'neutral', themes: [] };
  }

  // Determine play time context
  getPlayTimeContext(hour, dayOfWeek) {
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const now = new Date();
    const financialCycle = this.getFinancialCycleContext(now);
    
    let context = {};
    
    // Base time context with focus/attention factors
    if (hour >= 9 && hour <= 17 && !isWeekend) {
      context = {
        type: 'work-hours',
        intensity: 'low',
        description: 'Workday stealth gaming',
        focusLevel: 'split-attention', // Watching for supervisor
        attentionSpan: 'very-short', // Must alt-tab quickly
        preferredPace: 'fast', // Quick dopamine hits
        preferredVolatility: 'low-medium', // Can't afford emotional investment
        sessionStyle: 'micro-sessions', // 1-3 minutes max
        interruptionRisk: 'high',
        reasoning: 'During work: needs instant gratification, easy pause/resume, low cognitive load, muted audio, simple mechanics'
      };
    } else if (hour >= 12 && hour <= 14 && !isWeekend) {
      context = {
        type: 'lunch-break',
        intensity: 'medium',
        description: 'Quick lunch session',
        focusLevel: 'moderate',
        attentionSpan: 'very-short',
        preferredPace: 'fast',
        preferredVolatility: 'medium-high', // Time-limited, want excitement
        reasoning: 'Short time window - needs immediate gratification and excitement'
      };
    } else if (hour >= 17 && hour <= 23) {
      context = {
        type: 'evening',
        intensity: 'high',
        description: 'Prime gaming time',
        focusLevel: 'high',
        attentionSpan: 'long',
        preferredPace: 'medium',
        preferredVolatility: 'any', // Open to exploration
        reasoning: 'Peak attention and leisure time - ideal for immersive gaming experiences'
      };
    } else if (hour >= 0 && hour <= 4) {
      context = {
        type: 'late-night',
        intensity: 'medium',
        description: 'Late night session',
        focusLevel: 'tired',
        attentionSpan: 'medium',
        preferredPace: 'slow',
        preferredVolatility: 'low-medium', // Less stimulation when tired
        reasoning: 'Reduced cognitive capacity at late hours - prefers relaxing, meditative gameplay with calming themes'
      };
    } else if (isWeekend && hour >= 10 && hour <= 16) {
      context = {
        type: 'weekend-day',
        intensity: 'high',
        description: 'Weekend leisure time',
        focusLevel: 'relaxed',
        attentionSpan: 'long',
        preferredPace: 'medium',
        preferredVolatility: 'high', // Weekend indulgence
        reasoning: 'Relaxed weekend mindset - ready for entertaining and potentially rewarding games'
      };
    } else {
      context = {
        type: 'off-peak',
        intensity: 'medium',
        description: 'Off-peak play',
        focusLevel: 'moderate',
        attentionSpan: 'medium',
        preferredPace: 'medium',
        preferredVolatility: 'medium',
        reasoning: 'Standard gaming session - balanced preferences'
      };
    }
    
    // Layer in financial cycle context
    context.financialCycle = financialCycle;
    
    // Adjust recommendations based on financial cycle
    if (financialCycle.phase === 'pre-payday' || financialCycle.phase === 'end-of-month-tight') {
      context.preferredVolatility = 'low'; // Conservative when money is tight
      context.description += ' (conservative period)';
      context.reasoning += '. Financial constraints suggest lower-risk gaming preferences.';
    } else if (financialCycle.phase === 'post-payday' || financialCycle.phase === 'mid-month-comfortable') {
      // Keep original volatility preference or increase it
      if (context.preferredVolatility === 'low') context.preferredVolatility = 'medium';
      else if (context.preferredVolatility === 'medium') context.preferredVolatility = 'medium-high';
      context.description += ' (comfortable period)';
      context.reasoning += '. Financial comfort allows for more adventurous gaming choices.';
    }
    
    return context;
  }
  
  // Get financial cycle context (payday patterns, end of month)
  getFinancialCycleContext(now) {
    const day = now.getDate();
    const month = now.getMonth();
    const year = now.getFullYear();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const dayOfWeek = now.getDay(); // 0=Sunday, 5=Friday
    
    // Calculate key payday dates
    const lastWorkingDay = this.getLastWorkingDay(year, month);
    const lastFridayOfMonth = this.getLastFridayOfMonth(year, month);
    const daysSinceLastPayday = this.getDaysSinceLastPayday(now, lastWorkingDay, lastFridayOfMonth);
    
    let phase, intensity, description;
    
    // Post-payday period (0-7 days after payday)
    if (daysSinceLastPayday <= 7) {
      phase = 'post-payday';
      intensity = 'high';
      description = `Post-payday comfort (${daysSinceLastPayday} days since payday)`;
    }
    // Mid-cycle comfortable period (8-20 days since payday)
    else if (daysSinceLastPayday <= 20) {
      phase = 'mid-month-comfortable';
      intensity = 'medium';
      description = `Mid-cycle period (${daysSinceLastPayday} days since payday)`;
    }
    // Pre-payday tightening (21+ days since payday)
    else {
      phase = 'pre-payday';
      intensity = 'medium-high';
      description = `Pre-payday period (${daysSinceLastPayday} days since payday)`;
    }
    
    // Check if today or yesterday was payday
    const isToday = day === lastWorkingDay || day === lastFridayOfMonth;
    const wasYesterday = (day - 1) === lastWorkingDay || (day - 1) === lastFridayOfMonth;
    const isLikelyPayday = isToday || wasYesterday;
    
    // Override phase if it's payday or day after
    if (isLikelyPayday) {
      phase = 'post-payday';
      intensity = 'high';
      description = wasYesterday ? 'Day after payday - peak spending comfort' : 'Payday - maximum spending comfort';
    }
    
    return {
      phase,
      intensity,
      description,
      dayOfMonth: day,
      totalDaysInMonth: lastDayOfMonth,
      isLikelyPayday,
      daysSincePayday: daysSinceLastPayday,
      lastPaydayDate: Math.max(lastWorkingDay, lastFridayOfMonth),
      budgetPressure: phase === 'pre-payday' ? 'medium-high' : phase === 'post-payday' ? 'low' : 'medium'
    };
  }

  // Get last working day of month
  getLastWorkingDay(year, month) {
    const lastDay = new Date(year, month + 1, 0);
    let day = lastDay.getDate();
    
    // Walk backwards to find last weekday
    while (day > 0) {
      const testDate = new Date(year, month, day);
      const dayOfWeek = testDate.getDay();
      // Monday=1, Friday=5 (skip Saturday=6, Sunday=0)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        return day;
      }
      day--;
    }
    return day;
  }

  // Get last Friday of month
  getLastFridayOfMonth(year, month) {
    const lastDay = new Date(year, month + 1, 0);
    let day = lastDay.getDate();
    
    // Walk backwards to find last Friday
    while (day > 0) {
      const testDate = new Date(year, month, day);
      if (testDate.getDay() === 5) { // Friday
        return day;
      }
      day--;
    }
    return day;
  }

  // Calculate days since most recent payday (last working day or last Friday)
  getDaysSinceLastPayday(now, lastWorkingDay, lastFridayOfMonth) {
    const currentDay = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Most recent payday is the later of last working day or last Friday
    const mostRecentPayday = Math.max(lastWorkingDay, lastFridayOfMonth);
    
    // If we're past the payday this month, calculate days since
    if (currentDay >= mostRecentPayday) {
      return currentDay - mostRecentPayday;
    }
    
    // If we haven't reached this month's payday yet, calculate from previous month
    const previousMonth = currentMonth - 1;
    const previousYear = previousMonth < 0 ? currentYear - 1 : currentYear;
    const adjustedMonth = previousMonth < 0 ? 11 : previousMonth;
    
    const prevLastWorkingDay = this.getLastWorkingDay(previousYear, adjustedMonth);
    const prevLastFridayOfMonth = this.getLastFridayOfMonth(previousYear, adjustedMonth);
    const prevPayday = Math.max(prevLastWorkingDay, prevLastFridayOfMonth);
    
    // Days from previous payday to end of previous month
    const prevMonthLastDay = new Date(previousYear, adjustedMonth + 1, 0).getDate();
    const daysFromPrevPayday = prevMonthLastDay - prevPayday;
    
    // Plus days into current month
    return daysFromPrevPayday + currentDay;
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

      // Load prompt template from file
      let promptTemplate = loadPrompt('player-context-analysis-prompt.md');
      
      if (!promptTemplate) {
        // Fallback to embedded prompt if file loading fails
        promptTemplate = `Analyze this player context and provide a brief recommendation insight:
PLAYER CONTEXT:
- Confidence Level: {{confidenceLevel}} ({{confidenceScore}}%)
- Time: {{currentTime}}
- Device: {{device}}
- Referrer: {{referrer}}
- Timezone: {{timezone}}
TEMPORAL FACTORS:
- {{weekendStatus}} {{playTimeDescription}}
- Active Holidays: {{activeHolidays}}
- Sports Seasons: {{sportsSeason}}
CONFIDENCE FACTORS:
{{confidenceFactors}}
Provide a 1-2 sentence summary of what this context means for game recommendations, focusing on the most relevant factors for personalizing slot game suggestions.`;
      }

      // Replace template variables with actual values
      const prompt = promptTemplate
        .replace('{{confidenceLevel}}', contextData.confidence?.level || 'unknown')
        .replace('{{confidenceScore}}', Math.round((contextData.confidence?.score || 0) * 100))
        .replace('{{currentTime}}', contextData.temporal?.currentTime?.localeInfo?.fullDateTime || 'Unknown time')
        .replace('{{device}}', contextData.device || 'Unknown')
        .replace('{{referrer}}', contextData.referrer || 'Direct visit')
        .replace('{{timezone}}', contextData.timezone || 'Unknown')
        .replace('{{weekendStatus}}', contextData.temporal?.currentTime?.isWeekend ? 'Weekend' : 'Weekday')
        .replace('{{playTimeDescription}}', contextData.temporal?.playTimeContext?.description || '')
        .replace('{{activeHolidays}}', contextData.temporal?.activeHolidays?.map(h => h.name).join(', ') || 'None')
        .replace('{{sportsSeason}}', contextData.temporal?.sportsSeason?.map(s => s.sport.toUpperCase()).join(', ') || 'None active')
        .replace('{{confidenceFactors}}', contextData.confidence?.factors?.map(f => `- ${f}`).join('\n') || '- Basic session data only');

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
    const temporal = playerContext.temporal;
    const confidence = playerContext.confidence;
    
    // Generate dynamic, varied responses based on multiple context factors
    const contextFactors = this.analyzeContextFactors(playerContext);
    
    // Select response template based on primary context
    const responses = this.getContextResponseTemplates();
    const primaryContext = contextFactors.primary;
    const availableResponses = responses[primaryContext] || responses.default;
    
    // Pick random response template to avoid repetition
    const randomIndex = Math.floor(Math.random() * availableResponses.length);
    const template = availableResponses[randomIndex];
    
    // Replace placeholders with actual context data
    return this.interpolateContextTemplate(template, contextFactors);
  }

  // Analyze context to determine primary factors and themes
  analyzeContextFactors(playerContext) {
    const factors = {
      primary: 'standard',
      timeContext: null,
      seasonalContext: null,
      eventContext: null,
      sportContext: null,
      moodContext: null,
      themes: []
    };
    
    const temporal = playerContext.temporal;
    const playTime = temporal?.playTimeContext;
    
    // Determine primary context
    if (playTime?.type === 'work-hours') {
      factors.primary = 'work';
      factors.timeContext = 'stealth gaming session';
    } else if (temporal?.currentTime?.isWeekend) {
      factors.primary = 'weekend';
      factors.timeContext = 'weekend leisure time';
    } else if (temporal?.currentTime?.isEvening) {
      factors.primary = 'evening';
      factors.timeContext = 'prime gaming hours';
    } else if (temporal?.currentTime?.isLateNight) {
      factors.primary = 'latenight';
      factors.timeContext = 'late night session';
    }
    
    // Add seasonal context
    if (temporal?.season) {
      factors.seasonalContext = temporal.season.name;
      factors.themes.push(...temporal.season.themes);
    }
    
    // Add holiday context
    if (temporal?.activeHolidays?.length > 0) {
      const holiday = temporal.activeHolidays[0];
      factors.eventContext = holiday.name.replace('-', ' ');
      factors.themes.push(...holiday.themes);
    }
    
    // Add sports context
    if (temporal?.sportsSeason?.length > 0) {
      const sport = temporal.sportsSeason[0];
      factors.sportContext = sport.sport;
      factors.themes.push(...(sport.themes || []));
    }
    
    // Add weather/mood context
    if (temporal?.weather) {
      factors.moodContext = temporal.weather.mood;
      factors.themes.push(...temporal.weather.themes);
    }
    
    return factors;
  }

  // Get varied response templates for different contexts
  getContextResponseTemplates() {
    return {
      work: [
        "Perfect for quick {timeContext} - suggesting fast-paced, low-risk games that won't draw attention.",
        "Work break detected! Recommending instant-gratification slots with easy pause/resume features.",
        "Stealth mode gaming time - focusing on {moodContext} themes with minimal visual complexity.",
        "Quick session opportunity - suggesting games optimized for micro-breaks and split attention."
      ],
      weekend: [
        "{timeContext} calls for high-engagement experiences with {themes} themes to match your relaxed mood.",
        "Weekend vibes detected! Perfect timing for exploring higher volatility games and {seasonalContext} themes.",
        "Leisure time optimization - recommending immersive experiences with {eventContext} seasonal flair.",
        "Weekend gaming at its finest - suggesting premium experiences with {sportContext} excitement."
      ],
      evening: [
        "{timeContext} - ideal for deeper gaming experiences with {themes} themes and engaging mechanics.",
        "Prime gaming window open! Focusing on {moodContext} experiences with seasonal {seasonalContext} appeal.",
        "Evening session detected - recommending games that match the {eventContext} atmosphere.",
        "Perfect timing for immersive gameplay with {sportContext} energy and {themes} themes."
      ],
      latenight: [
        "{timeContext} suggests relaxing, low-stimulation games with {themes} themes for unwinding.",
        "Night owl gaming - focusing on atmospheric {seasonalContext} experiences with gentle pacing.",
        "Late night ambiance calls for {moodContext} games with soothing {themes} themes.",
        "Midnight gaming session - suggesting contemplative experiences with {eventContext} charm."
      ],
      default: [
        "Current {seasonalContext} season suggests games with {themes} themes and {moodContext} gameplay.",
        "Perfect timing for {eventContext}-inspired experiences with engaging {themes} mechanics.",
        "Gaming session optimized for {moodContext} mood with seasonal {themes} themes.",
        "{sportContext} season energy calls for high-engagement games with {themes} excitement.",
        "Contextual gaming experience featuring {themes} themes tailored to current {seasonalContext} vibes."
      ]
    };
  }

  // Replace template placeholders with actual context data
  interpolateContextTemplate(template, factors) {
    return template
      .replace('{timeContext}', factors.timeContext || 'gaming session')
      .replace('{seasonalContext}', factors.seasonalContext || 'current')
      .replace('{eventContext}', factors.eventContext || 'seasonal')
      .replace('{sportContext}', factors.sportContext || 'current season')
      .replace('{moodContext}', factors.moodContext || 'engaging')
      .replace('{themes}', factors.themes.slice(0, 2).join(' and ') || 'varied');
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