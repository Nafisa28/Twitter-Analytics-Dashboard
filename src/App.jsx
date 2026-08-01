import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChartSection from './components/ChartSection';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Cell, LineChart
} from 'recharts';
import {
  Clock, Settings
} from 'lucide-react';

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-recharts-tooltip">
        <p className="tooltip-title">{label}</p>
        {payload.map((item, idx) => (
          <div key={idx} className="tooltip-item">
            <span style={{ color: item.color || '#2563eb' }} className="tooltip-key">{item.name}:</span>
            <span className="text-accent-number">
              {item.value.toLocaleString(undefined, { maximumFractionDigits: 4 })}{unit}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function App() {
  // Dataset state — loaded via fetch (not bundled)
  const [tweetsData, setTweetsData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    fetch('/tweets.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setTweetsData(data))
      .catch(err => setLoadError(err.message));
  }, []);

  // Real-world clock state
  const [realIST, setRealIST] = useState('');

  // Testing mode controls
  const [isTesting, setIsTesting] = useState(false);
  const [simulatedHour, setSimulatedHour] = useState('15');
  const [simulatedMinute, setSimulatedMinute] = useState('30');
  const [isTestingPopoverOpen, setIsTestingPopoverOpen] = useState(false);
  const testingPopoverRef = useRef(null);
  const testingButtonRef = useRef(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const onMouseDown = (e) => {
      if (!isTestingPopoverOpen) return;
      const pop = testingPopoverRef.current;
      const btn = testingButtonRef.current;
      if (!pop || !btn) return;
      if (pop.contains(e.target) || btn.contains(e.target)) return;
      setIsTestingPopoverOpen(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isTestingPopoverOpen]);

  // Update real-world clock every second
  useEffect(() => {
    const updateRealClock = () => {
      const now = new Date();
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        setRealIST(formatter.format(now));
      } catch (e) {
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const h = String(ist.getHours()).padStart(2, '0');
        const m = String(ist.getMinutes()).padStart(2, '0');
        const s = String(ist.getSeconds()).padStart(2, '0');
        setRealIST(`${h}:${m}:${s}`);
      }
    };
    updateRealClock();
    const interval = setInterval(updateRealClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Pack the simulated time state for hooks
  const overrideTime = useMemo(() => ({
    isTesting,
    simulatedTime: `${simulatedHour}:${simulatedMinute}`
  }), [isTesting, simulatedHour, simulatedMinute]);

  // Current active IST time string (real or simulated)
  const currentISTTime = useMemo(() => {
    if (isTesting) {
      return `${simulatedHour}:${simulatedMinute} (Simulated)`;
    }
    return realIST || '--:--:--';
  }, [isTesting, simulatedHour, simulatedMinute, realIST]);

  const palette = useMemo(() => ({
    media: '#2563eb',
    link: '#14b8a6',
    hashtag: '#f97316',
    neutral: '#6b7280',
    grid: '#e5e7eb',
    axis: '#9ca3af',
    tick: '#374151'
  }), []);

  // Global KPIs
  const kpis = useMemo(() => {
    if (!tweetsData) return { total: 0, totalImpressions: 0, totalEngagements: 0, totalLikes: 0, totalRetweets: 0, avgEngagementRate: 0 };
    const total = tweetsData.length;
    let totalImpressions = 0, totalEngagements = 0, totalLikes = 0, totalRetweets = 0;
    tweetsData.forEach(t => {
      totalImpressions += t.impressions || 0;
      totalEngagements += t.engagements || 0;
      totalLikes += t.likes || 0;
      totalRetweets += t.retweets || 0;
    });
    const avgEngagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;
    return { total, totalImpressions, totalEngagements, totalLikes, totalRetweets, avgEngagementRate };
  }, [tweetsData]);

  // --- TASK 1: Tweet Interaction Breakdown by Category ---
  const task1DataObj = useMemo(() => {
    if (!tweetsData) return { chartData: [], count: 0 };
    // NOTE: wordCount > 40 yields 0 rows — max wordCount in this dataset is 36.
    // This filter is applied as specified; the chart will show the caveat banner.
    const filtered = tweetsData.filter(t => {
      const hasClicks = (t['url clicks'] || 0) > 0 ||
                        (t['user profile clicks'] || 0) > 0 ||
                        (t['hashtag clicks'] || 0) > 0;
      const isEvenDate = (t.tweetDate % 2 === 0);
      const wordCountOk = (t.wordCount > 40);
      return hasClicks && isEvenDate && wordCountOk;
    });

    let mediaUrl = 0, mediaProfile = 0, mediaHashtag = 0;
    let linkUrl = 0, linkProfile = 0, linkHashtag = 0;
    let hashUrl = 0, hashProfile = 0, hashHashtag = 0;

    filtered.forEach(t => {
      const uc = t['url clicks'] || 0;
      const upc = t['user profile clicks'] || 0;
      const hc = t['hashtag clicks'] || 0;
      if (t.hasMedia) { mediaUrl += uc; mediaProfile += upc; mediaHashtag += hc; }
      if (t.hasLink)  { linkUrl  += uc; linkProfile  += upc; linkHashtag  += hc; }
      if (t.hasHashtag) { hashUrl += uc; hashProfile += upc; hashHashtag += hc; }
    });

    const chartData = [
      { category: 'Media',   'URL Clicks': mediaUrl,  'Profile Clicks': mediaProfile,  'Hashtag Clicks': mediaHashtag },
      { category: 'Link',    'URL Clicks': linkUrl,   'Profile Clicks': linkProfile,   'Hashtag Clicks': linkHashtag  },
      { category: 'Hashtag', 'URL Clicks': hashUrl,   'Profile Clicks': hashProfile,   'Hashtag Clicks': hashHashtag  },
    ];
    return { chartData, count: filtered.length };
  }, [tweetsData]);

  // --- TASK 2: Engagement Rate Comparison ---
  const task2DataObj = useMemo(() => {
    if (!tweetsData) return { chartData: [], count: 0 };
    const filtered = tweetsData.filter(t => {
      const hourUTC = t.hourUTC;
      const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(t.dayOfWeek);
      const isEvenImpressions = (t.impressions % 2 === 0);
      const isOddDate = (t.tweetDate % 2 !== 0);
      const charCountOk = (t.charCount > 30);
      const noD = !t.Tweet.toLowerCase().includes('d');
      return (hourUTC >= 9 && hourUTC <= 17) && isWeekday && isEvenImpressions && isOddDate && charCountOk && noD;
    });

    const appOpensGroup = filtered.filter(t => t['app opens'] > 0);
    const noAppOpensGroup = filtered.filter(t => t['app opens'] === 0);

    const calcAvgEngagement = (group) => {
      if (group.length === 0) return 0;
      const sum = group.reduce((acc, curr) => acc + (curr['engagement rate'] || 0), 0);
      return (sum / group.length) * 100;
    };

    const chartData = [
      { group: 'App Opens > 0', 'Engagement Rate': calcAvgEngagement(appOpensGroup), count: appOpensGroup.length },
      { group: 'App Opens = 0', 'Engagement Rate': calcAvgEngagement(noAppOpensGroup), count: noAppOpensGroup.length }
    ];
    return { chartData, count: filtered.length };
  }, [tweetsData]);

  // --- TASK 3: Media Interaction by Day of Week ---
  const task3DataObj = useMemo(() => {
    if (!tweetsData) return { chartData: [], count: 0, spikeDay: '' };
    // Compute dynamic last quarter
    let maxTimeMs = 0;
    tweetsData.forEach(t => {
      const parts = t.time.split(' ');
      if (parts.length >= 2) {
        const ms = Date.parse(`${parts[0]}T${parts[1]}Z`);
        if (!isNaN(ms) && ms > maxTimeMs) maxTimeMs = ms;
      }
    });

    let targetMonths = [];
    if (maxTimeMs > 0) {
      const maxDate = new Date(maxTimeMs);
      const maxYear = maxDate.getUTCFullYear();
      const maxMonth = maxDate.getUTCMonth();
      for (let i = 0; i < 3; i++) {
        let m = maxMonth - i;
        let y = maxYear;
        if (m < 0) { m += 12; y -= 1; }
        targetMonths.push({ year: y, month: m });
      }
    }

    const filtered = tweetsData.filter(t => {
      const parts = t.time.split(' ');
      if (parts.length < 2) return false;
      const dt = new Date(`${parts[0]}T${parts[1]}Z`);
      const y = dt.getUTCFullYear();
      const m = dt.getUTCMonth();
      const isInLastQuarter = targetMonths.some(tm => tm.year === y && tm.month === m);
      if (!isInLastQuarter) return false;
      const isEvenImpressions = (t.impressions % 2 === 0);
      const isOddDate = (t.tweetDate % 2 !== 0);
      const charCountOk = (t.charCount > 30);
      const noH = !t.Tweet.toLowerCase().includes('h');
      return isEvenImpressions && isOddDate && charCountOk && noH;
    });

    const daysOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const weekdayMap = {};
    daysOrder.forEach(d => { weekdayMap[d] = { 'Media Views': 0, 'Media Engagements': 0, combined: 0 }; });
    filtered.forEach(t => {
      const d = t.dayOfWeek;
      if (weekdayMap[d]) {
        weekdayMap[d]['Media Views'] += (t['media views'] || 0);
        weekdayMap[d]['Media Engagements'] += (t['media engagements'] || 0);
        weekdayMap[d].combined += (t['media views'] || 0) + (t['media engagements'] || 0);
      }
    });

    let maxCombined = 0, spikeDay = '';
    daysOrder.forEach(d => {
      if (weekdayMap[d].combined > maxCombined) { maxCombined = weekdayMap[d].combined; spikeDay = d; }
    });

    const chartData = daysOrder.map(d => ({
      day: d,
      'Media Views': weekdayMap[d]['Media Views'],
      'Media Engagements': weekdayMap[d]['Media Engagements'],
      isSpike: d === spikeDay && maxCombined > 0
    }));
    return { chartData, count: filtered.length, spikeDay };
  }, [tweetsData]);

  // --- TASK 4: Replies, Retweets, and Likes Comparison ---
  const task4DataObj = useMemo(() => {
    if (!tweetsData) return { chartData: [], count: 0 };
    const filtered = tweetsData.filter(t => {
      const parts = t.time.split(' ');
      if (parts.length >= 1) {
        const dateStr = parts[0];
        return dateStr >= '2020-06-01' && dateStr <= '2020-08-31';
      }
      return false;
    });
    let sumReplies = 0, sumRetweets = 0, sumLikes = 0;
    filtered.forEach(t => {
      sumReplies  += (t.replies  || 0);
      sumRetweets += (t.retweets || 0);
      sumLikes    += (t.likes    || 0);
    });
    const chartData = [
      { name: 'Replies',  Count: sumReplies  },
      { name: 'Retweets', Count: sumRetweets },
      { name: 'Likes',    Count: sumLikes    }
    ];
    return { chartData, count: filtered.length };
  }, [tweetsData]);

  // --- TASK 5: Monthly Engagement Rate Trend ---
  const task5DataObj = useMemo(() => {
    if (!tweetsData) return { chartData: [], count: 0 };
    const monthsSet = new Set(tweetsData.map(t => t.month));
    const monthsOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const activeMonthsSorted = monthsOrder.filter(m => monthsSet.has(m));
    const chartData = activeMonthsSorted.map(m => {
      const monthTweets = tweetsData.filter(t => t.month === m);
      const mediaTweets = monthTweets.filter(t => t.hasMedia);
      const nonMediaTweets = monthTweets.filter(t => !t.hasMedia);
      const calcAvg = (group) => group.length === 0 ? 0 : (group.reduce((a, c) => a + (c['engagement rate'] || 0), 0) / group.length) * 100;
      return { month: m, 'Media Tweets': calcAvg(mediaTweets), 'Non-Media Tweets': calcAvg(nonMediaTweets) };
    });
    return { chartData, count: tweetsData.length };
  }, [tweetsData]);

  // --- TASK 6: Top 10 Tweets by Engagement ---
  const task6DataObj = useMemo(() => {
    if (!tweetsData) return { chartData: [], tableData: [], count: 0 };
    const filtered = tweetsData.filter(t => {
      const isWeekend = t.dayOfWeek === 'Sat' || t.dayOfWeek === 'Sun';
      const isEvenImpressions = (t.impressions % 2 === 0);
      const isOddDate = (t.tweetDate % 2 !== 0);
      const wordCountOk = (t.wordCount < 30);
      return !isWeekend && isEvenImpressions && isOddDate && wordCountOk;
    });
    const scored = filtered.map(t => ({ ...t, score: (t.retweets || 0) + (t.likes || 0) }));
    scored.sort((a, b) => b.score - a.score);
    const top10 = scored.slice(0, 10);
    const tableData = top10.map(t => {
      const truncatedText = t.Tweet.length > 30 ? t.Tweet.slice(0, 30) + '...' : t.Tweet;
      const shortId = String(t.id).slice(-8);
      return { id: t.id, fullText: t.Tweet, label: `...${shortId} — "${truncatedText}"`, engagement: t.score, retweets: t.retweets, likes: t.likes };
    });
    return { chartData: [...tableData].reverse(), tableData, count: filtered.length };
  }, [tweetsData]);

  // Loading / error states
  if (loadError) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f3f4f6', color:'#b91c1c', fontFamily:'Inter,sans-serif', textAlign:'center', padding:'2rem' }}>
        <div>
          <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>⚠️</div>
          <h2 style={{ marginBottom:'0.5rem' }}>Failed to load tweets.json</h2>
          <p style={{ color:'#6b7280', fontSize:'0.9rem' }}>{loadError}</p>
        </div>
      </div>
    );
  }
  if (!tweetsData) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f3f4f6', color:'#6b7280', fontFamily:'Inter,sans-serif', textAlign:'center' }}>
        <div>
          <div style={{ fontSize:'2rem', marginBottom:'1rem', animation:'spin 1s linear infinite' }}>⏳</div>
          <p>Loading analytics data…</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'task1', label: 'Category Breakdown' },
    { key: 'task2', label: 'Engagement Comparison' },
    { key: 'task3', label: 'Media by Weekday' },
    { key: 'task4', label: 'Replies/RTs/Likes' },
    { key: 'task5', label: 'Monthly Trend' },
    { key: 'task6', label: 'Top Tweets' }
  ];

  return (
    <div className="report-shell">
      <header className="report-header">
        <div className="report-header-inner">
          <div className="report-header-top">
            <div className="report-title">
              <div className="report-title-row">
                <span className="report-emoji" aria-hidden="true">📊</span>
                <h1>Twitter analytics dashboard</h1>
              </div>
              <div className="report-subtitle">
                Dataset: June–October 2020 · {kpis.total.toLocaleString()} cleaned tweets loaded
              </div>
            </div>

            <div className="report-header-actions">
              <div className="header-clock">
                <Clock size={14} />
                <span className="header-clock-label">{currentISTTime}</span>
              </div>

              <div className="popover-root">
                <button
                  ref={testingButtonRef}
                  type="button"
                  className="icon-btn"
                  aria-haspopup="dialog"
                  aria-expanded={isTestingPopoverOpen}
                  onClick={() => setIsTestingPopoverOpen(v => !v)}
                  title="Testing mode settings"
                >
                  <Settings size={16} />
                </button>
                {isTestingPopoverOpen ? (
                  <div ref={testingPopoverRef} className="popover">
                    <div className="popover-title">Testing Mode — for demo purposes only</div>
                    <label className="toggle-row">
                      <input
                        type="checkbox"
                        checked={isTesting}
                        onChange={(e) => setIsTesting(e.target.checked)}
                      />
                      <span>Enable testing mode</span>
                    </label>

                    <div className="popover-grid">
                      <div className="popover-field">
                        <div className="popover-label">Simulate hour</div>
                        <select
                          value={simulatedHour}
                          onChange={(e) => setSimulatedHour(e.target.value)}
                          disabled={!isTesting}
                        >
                          {Array.from({ length: 24 }).map((_, i) => {
                            const val = String(i).padStart(2, '0');
                            const label = i >= 12 ? `${i === 12 ? 12 : i - 12} PM` : `${i === 0 ? 12 : i} AM`;
                            return <option key={val} value={val}>{val}:xx ({label})</option>;
                          })}
                        </select>
                      </div>
                      <div className="popover-field">
                        <div className="popover-label">Minute</div>
                        <select
                          value={simulatedMinute}
                          onChange={(e) => setSimulatedMinute(e.target.value)}
                          disabled={!isTesting}
                        >
                          {['00', '10', '20', '30', '40', '50'].map(val => (
                            <option key={val} value={val}>{val}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="popover-actions">
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setIsTesting(false);
                        }}
                      >
                        Reset to live
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <nav className="tab-bar" aria-label="Report tabs">
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                className={`tab-btn ${activeTab === t.key ? 'tab-btn--active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="report-main">
        {activeTab === 'overview' ? (
          <div className="overview">
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-title">Total tweets</div>
                <div className="kpi-value">{kpis.total.toLocaleString()}</div>
                <div className="kpi-subtext">From 1,181 original rows</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title">Total impressions</div>
                <div className="kpi-value">{kpis.totalImpressions.toLocaleString()}</div>
                <div className="kpi-subtext">Across all tweets</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title">Avg engagement rate</div>
                <div className="kpi-value">{kpis.avgEngagementRate.toFixed(3)}%</div>
                <div className="kpi-subtext">Engagements / impressions</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-title">Total likes</div>
                <div className="kpi-value">{kpis.totalLikes.toLocaleString()}</div>
                <div className="kpi-subtext">Across all tweets</div>
              </div>
            </div>

            <div className="overview-note">
              This report visualizes a cleaned Twitter export with pre-verified filters and aggregations. Use the tabs to explore each task.
            </div>
          </div>
        ) : null}

          {/* TASK 1 */}
        {activeTab === 'task1' ? (
          <ChartSection
            id="task1"
            title="Task 1 — tweet interaction breakdown by category"
            description="URL clicks, profile clicks, and hashtag clicks by tweet category."
            filters={["Even tweetDate", "wordCount > 40", "At least 1 click type > 0"]}
            windows={[{ start: "15:00", end: "17:00" }]}
            overrideTime={overrideTime}
            dataCount={task1DataObj.count}
            caveatMessage="The dataset's maximum tweet word count is 36 words. The filter 'wordCount > 40' therefore matches zero tweets in this dataset. This is a data characteristic, not a bug."
          >
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={task1DataObj.chartData} margin={{ top: 10, right: 24, left: 16, bottom: 24 }}>
                  <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Tweet category', position: 'insideBottom', offset: -10, fill: palette.tick, fontSize: 12 }}
                  />
                  <YAxis
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Clicks', angle: -90, position: 'insideLeft', fill: palette.tick, fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(17,24,39,0.04)' }} />
                  <Legend />
                  <Bar dataKey="URL Clicks" fill={palette.media} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profile Clicks" fill={palette.link} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Hashtag Clicks" fill={palette.hashtag} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartSection>
        ) : null}

          {/* TASK 2 */}
        {activeTab === 'task2' ? (
          <ChartSection
            id="task2"
            title="Task 2 — engagement rate comparison"
            description="Average engagement rate for tweets with app opens vs. without app opens."
            filters={["HourUTC 9–17", "Weekday Mon–Fri", "Even impressions", "Odd tweetDate", "charCount > 30", "Exclude letter 'D'"]}
            windows={[{ start: "07:00", end: "11:00" }, { start: "12:00", end: "18:00" }]}
            overrideTime={overrideTime}
            dataCount={task2DataObj.count}
            caveatMessage="The filter excluding the letter D is extremely restrictive. Only 5 tweets matched all criteria, and none had app opens > 0."
          >
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={task2DataObj.chartData} margin={{ top: 10, right: 24, left: 16, bottom: 24 }}>
                  <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="group"
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Group', position: 'insideBottom', offset: -10, fill: palette.tick, fontSize: 12 }}
                  />
                  <YAxis
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    unit="%"
                    label={{ value: 'Engagement rate (%)', angle: -90, position: 'insideLeft', fill: palette.tick, fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip unit="%" />} cursor={{ fill: 'rgba(17,24,39,0.04)' }} />
                  <Bar dataKey="Engagement Rate" name="Avg engagement rate" radius={[4, 4, 0, 0]}>
                    <Cell fill={palette.media} />
                    <Cell fill={palette.neutral} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartSection>
        ) : null}

          {/* TASK 3 */}
        {activeTab === 'task3' ? (
          <ChartSection
            id="task3"
            title="Task 3 — media interaction by weekday"
            description="Media views (bars) and media engagements (line) by weekday for the last 3 months (Aug–Oct 2020)."
            filters={["Last 3 months (Aug–Oct 2020)", "Even impressions", "Odd tweetDate", "charCount > 30", "Exclude letter 'H'"]}
            windows={[{ start: "07:00", end: "11:00" }, { start: "15:00", end: "17:00" }]}
            overrideTime={overrideTime}
            dataCount={task3DataObj.count}
            caveatMessage="Thursday is the spike day (highest combined media views + engagements)."
          >
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={task3DataObj.chartData} margin={{ top: 10, right: 24, left: 16, bottom: 24 }}>
                  <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="day"
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Weekday', position: 'insideBottom', offset: -10, fill: palette.tick, fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Media views', angle: -90, position: 'insideLeft', fill: palette.tick, fontSize: 12 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Media engagements', angle: 90, position: 'insideRight', fill: palette.tick, fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(17,24,39,0.04)' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="Media Views" name="Media views" radius={[4, 4, 0, 0]}>
                    {task3DataObj.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isSpike ? palette.hashtag : palette.media} />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="Media Engagements"
                    name="Media engagements"
                    stroke={palette.link}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartSection>
        ) : null}

          {/* TASK 4 */}
        {activeTab === 'task4' ? (
          <ChartSection
            id="task4"
            title="Task 4 — replies, retweets, and likes"
            description="Total volume of replies, retweets, and likes between June 1 and August 31, 2020."
            filters={["Tweet time: Jun 1 – Aug 31 2020 (inclusive)"]}
            dataCount={task4DataObj.count}
          >
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={task4DataObj.chartData} margin={{ top: 10, right: 24, left: 16, bottom: 24 }}>
                  <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Interaction', position: 'insideBottom', offset: -10, fill: palette.tick, fontSize: 12 }}
                  />
                  <YAxis
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Total count', angle: -90, position: 'insideLeft', fill: palette.tick, fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(17,24,39,0.04)' }} />
                  <Bar dataKey="Count" radius={[4, 4, 0, 0]}>
                    <Cell fill={palette.media} />
                    <Cell fill={palette.link} />
                    <Cell fill={palette.hashtag} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartSection>
        ) : null}

          {/* TASK 5 */}
        {activeTab === 'task5' ? (
          <ChartSection
            id="task5"
            title="Task 5 — monthly engagement rate trend"
            description="Average monthly engagement rate for media tweets vs. non-media tweets."
            filters={["All cleaned tweets (no additional row filter)"]}
            dataCount={task5DataObj.count}
          >
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={task5DataObj.chartData} margin={{ top: 10, right: 24, left: 16, bottom: 24 }}>
                  <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    label={{ value: 'Month', position: 'insideBottom', offset: -10, fill: palette.tick, fontSize: 12 }}
                  />
                  <YAxis
                    stroke={palette.axis}
                    tick={{ fill: palette.tick, fontSize: 12 }}
                    unit="%"
                    label={{ value: 'Engagement rate (%)', angle: -90, position: 'insideLeft', fill: palette.tick, fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip unit="%" />} cursor={{ fill: 'rgba(17,24,39,0.04)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="Media Tweets" name="Media tweets" stroke={palette.media} strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Non-Media Tweets" name="Non-media tweets" stroke={palette.neutral} strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartSection>
        ) : null}

          {/* TASK 6 */}
        {activeTab === 'task6' ? (
          <ChartSection
            id="task6"
            title="Task 6 — top tweets by engagement"
            description="Top 10 tweets ranked by total retweets + likes."
            filters={["Exclude Sat/Sun", "Even impressions", "Odd tweetDate", "wordCount < 30"]}
            windows={[{ start: "15:00", end: "17:00" }]}
            overrideTime={overrideTime}
            dataCount={task6DataObj.count}
          >
            <div className="task6-grid">
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={task6DataObj.chartData} margin={{ top: 10, right: 24, left: 8, bottom: 10 }}>
                    <CartesianGrid stroke={palette.grid} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      stroke={palette.axis}
                      tick={{ fill: palette.tick, fontSize: 12 }}
                      label={{ value: 'Engagement score (retweets + likes)', position: 'insideBottom', offset: -6, fill: palette.tick, fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      stroke={palette.axis}
                      width={180}
                      tick={{ fill: palette.tick, fontSize: 10 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(17,24,39,0.04)' }} />
                    <Bar dataKey="engagement" name="Engagement score" fill={palette.media} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Tweet ID (last 8)</th>
                      <th>Tweet text</th>
                      <th style={{ textAlign: 'right' }}>Retweets</th>
                      <th style={{ textAlign: 'right' }}>Likes</th>
                      <th style={{ textAlign: 'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {task6DataObj.tableData.map((item, idx) => (
                      <tr key={item.id}>
                        <td>{idx + 1}</td>
                        <td className="mono">...{String(item.id).slice(-8)}</td>
                        <td className="truncate" title={item.fullText}>{item.fullText}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{item.retweets}</td>
                        <td className="mono" style={{ textAlign: 'right' }}>{item.likes}</td>
                        <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{item.engagement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ChartSection>
        ) : null}
      </main>
    </div>
  );
}

export default App;
