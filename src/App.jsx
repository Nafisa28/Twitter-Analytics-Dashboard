import React, { useState, useEffect, useMemo } from 'react';
import ChartSection from './components/ChartSection';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Cell, LineChart
} from 'recharts';
import {
  Clock, TrendingUp, Database,
  Heart, Award, Eye, Sparkles, Sliders
} from 'lucide-react';

// Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label, unit = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-recharts-tooltip">
        <p className="tooltip-title">{label}</p>
        {payload.map((item, idx) => (
          <div key={idx} className="tooltip-item">
            <span style={{ color: item.color || '#3b82f6' }} className="font-semibold">{item.name}:</span>
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
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#090d16', color:'#f87171', fontFamily:'Inter,sans-serif', textAlign:'center', padding:'2rem' }}>
        <div>
          <div style={{ fontSize:'2rem', marginBottom:'1rem' }}>⚠️</div>
          <h2 style={{ marginBottom:'0.5rem' }}>Failed to load tweets.json</h2>
          <p style={{ color:'#94a3b8', fontSize:'0.9rem' }}>{loadError}</p>
        </div>
      </div>
    );
  }
  if (!tweetsData) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#090d16', color:'#94a3b8', fontFamily:'Inter,sans-serif', textAlign:'center' }}>
        <div>
          <div style={{ fontSize:'2rem', marginBottom:'1rem', animation:'spin 1s linear infinite' }}>⏳</div>
          <p>Loading analytics data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header Panel */}
      <header className="dashboard-header">
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <h1 className="text-2xl font-extrabold tracking-tight text-gradient">Twitter Analytics Dashboard</h1>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Visualizing Twitter campaign performance from June to October 2020 · {kpis.total.toLocaleString()} tweets loaded
              </p>
            </div>

            {/* Clock & Testing Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* IST Clock */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 shadow-sm">
                <Clock className="w-4 h-4" style={{ color: '#14b8a6' }} />
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Current IST Clock</div>
                  <div className="text-sm font-bold text-slate-200 tracking-wider font-mono">{currentISTTime}</div>
                </div>
              </div>

              {/* Demo Mode Toggle */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 shadow-sm">
                <Sliders className="w-4 h-4" style={{ color: '#a855f7' }} />
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Demo Override</div>
                  <label className="flex items-center gap-1.5 cursor-pointer mt-0.5">
                    <input
                      type="checkbox"
                      id="testing-mode-toggle"
                      checked={isTesting}
                      onChange={(e) => setIsTesting(e.target.checked)}
                      style={{ width:'14px', height:'14px', accentColor:'#a855f7' }}
                    />
                    <span className="text-xs font-semibold text-slate-300">Enable Test Mode</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Testing Mode Dropdowns */}
          {isTesting && (
            <div className="testing-panel">
              <div className="testing-title">
                <Sparkles className="w-4 h-4" />
                <span>Testing Mode — overrides real IST time for demo purposes only</span>
              </div>
              <div className="testing-controls">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Simulate Hour:</span>
                  <select
                    id="simulated-hour"
                    value={simulatedHour}
                    onChange={(e) => setSimulatedHour(e.target.value)}
                    className="custom-select"
                  >
                    {Array.from({ length: 24 }).map((_, i) => {
                      const val = String(i).padStart(2, '0');
                      const label = i >= 12 ? `${i === 12 ? 12 : i - 12} PM` : `${i === 0 ? 12 : i} AM`;
                      return <option key={val} value={val}>{val}:xx ({label})</option>;
                    })}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Minute:</span>
                  <select
                    id="simulated-minute"
                    value={simulatedMinute}
                    onChange={(e) => setSimulatedMinute(e.target.value)}
                    className="custom-select"
                  >
                    {['00', '10', '20', '30', '40', '50'].map(val => (
                      <option key={val} value={val}>{val}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => setIsTesting(false)} className="btn-secondary">Reset to Live</button>
              </div>
            </div>
          )}

          {/* Quick Navigation */}
          <nav className="mt-4 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2 hidden md:inline">Jump To:</span>
            <div className="nav-pills">
              <a href="#task1" className="nav-pill-btn">Category Breakdown</a>
              <a href="#task2" className="nav-pill-btn">Engagement Comparison</a>
              <a href="#task3" className="nav-pill-btn">Media by Weekday</a>
              <a href="#task4" className="nav-pill-btn">Replies/RTs/Likes</a>
              <a href="#task5" className="nav-pill-btn">Engagement Trend</a>
              <a href="#task6" className="nav-pill-btn">Top Tweets</a>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* KPI Cards */}
        <section className="mb-8">
          <div className="metrics-summary-grid">
            <div className="dashboard-card card-accent-blue flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg"><Database className="w-6 h-6" /></div>
              <div>
                <div className="kpi-title">Cleaned Tweets</div>
                <div className="kpi-value font-mono text-slate-100">{kpis.total.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">FROM 1,181 ORIGINAL ROWS</div>
              </div>
            </div>
            <div className="dashboard-card card-accent-teal flex items-center gap-4">
              <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-lg"><Eye className="w-6 h-6" /></div>
              <div>
                <div className="kpi-title">Total Impressions</div>
                <div className="kpi-value font-mono text-slate-100">{kpis.totalImpressions.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">ACROSS ALL CAMPAIGNS</div>
              </div>
            </div>
            <div className="dashboard-card card-accent-purple flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg"><TrendingUp className="w-6 h-6" /></div>
              <div>
                <div className="kpi-title">Avg Engagement Rate</div>
                <div className="kpi-value font-mono text-slate-100">{kpis.avgEngagementRate.toFixed(3)}%</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">ENGAGEMENTS / IMPRESSIONS</div>
              </div>
            </div>
            <div className="dashboard-card card-accent-rose flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg"><Heart className="w-6 h-6" /></div>
              <div>
                <div className="kpi-title">Total Likes</div>
                <div className="kpi-value font-mono text-slate-100">{kpis.totalLikes.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">ACROSS ALL TWEETS</div>
              </div>
            </div>
          </div>
        </section>

        {/* 6 Task Sections */}
        <div className="sections-stack">

          {/* TASK 1 */}
          <ChartSection
            id="task1"
            title="Task 1 — Tweet Interaction Breakdown by Category"
            description="Comparison of URL clicks, profile clicks, and hashtag clicks across media, link, and hashtag tweet categories."
            filters={["Even tweetDate", "wordCount > 40", "At least 1 click type > 0"]}
            windows={[{ start: "15:00", end: "17:00" }]}
            overrideTime={overrideTime}
            dataCount={task1DataObj.count}
            caveatMessage="The dataset's maximum tweet word count is 36 words. The filter 'wordCount > 40' as specified in the task requirements therefore matches zero tweets in this dataset. This is a data characteristic, not a bug — the filter is implemented exactly as specified."
            accentClass="card-accent-blue"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={task1DataObj.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#212c40" />
                <XAxis dataKey="category" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(33,44,64,0.2)' }} />
                <Legend />
                <Bar dataKey="URL Clicks"     fill="#3b82f6" radius={[4,4,0,0]} />
                <Bar dataKey="Profile Clicks" fill="#14b8a6" radius={[4,4,0,0]} />
                <Bar dataKey="Hashtag Clicks" fill="#a855f7" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* TASK 2 */}
          <ChartSection
            id="task2"
            title="Task 2 — Engagement Rate Comparison (App Opens)"
            description="Average engagement rate comparison between tweets that generated app opens vs. those that did not."
            filters={["HourUTC 9–17", "Weekday Mon–Fri", "Even impressions", "Odd tweetDate", "charCount > 30", "Exclude letter 'D'"]}
            windows={[{ start: "07:00", end: "11:00" }, { start: "12:00", end: "18:00" }]}
            overrideTime={overrideTime}
            dataCount={task2DataObj.count}
            caveatMessage="The 'exclude letter D' filter is extremely restrictive — D appears in nearly all English words. Only 5 tweets matched all criteria. Of those, 0 had app opens > 0, so the 'App Opens > 0' bar will render at 0%."
            accentClass="card-accent-purple"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={task2DataObj.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#212c40" />
                <XAxis dataKey="group" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" unit="%" />
                <Tooltip content={<CustomTooltip unit="%" />} cursor={{ fill: 'rgba(33,44,64,0.2)' }} />
                <Legend />
                <Bar dataKey="Engagement Rate" name="Avg Engagement Rate" radius={[4,4,0,0]}>
                  <Cell fill="#a855f7" />
                  <Cell fill="#e11d48" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* TASK 3 */}
          <ChartSection
            id="task3"
            title="Task 3 — Media Interaction by Day of Week"
            description="Dual-axis chart: media views (bars, left axis) and media engagements (line, right axis) per weekday. Spike day highlighted in rose. Data from the last 3 months of the dataset (Aug–Oct 2020)."
            filters={["Last 3 Months (Aug–Oct 2020)", "Even impressions", "Odd tweetDate", "charCount > 30", "Exclude letter 'H'"]}
            windows={[{ start: "07:00", end: "11:00" }, { start: "15:00", end: "17:00" }]}
            overrideTime={overrideTime}
            dataCount={task3DataObj.count}
            caveatMessage="The 'exclude letter H' filter is highly restrictive (H appears in very common words like 'the', 'this', 'that'). 80 tweets matched, giving modest but real chart values. Thursday is the spike day (highest combined media views + engagements)."
            accentClass="card-accent-teal"
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={task3DataObj.chartData} margin={{ top: 20, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#212c40" />
                <XAxis dataKey="day" stroke="#94a3b8" />
                <YAxis yAxisId="left"  stroke="#3b82f6" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="left" dataKey="Media Views" name="Media Views (Left)" radius={[4,4,0,0]}>
                  {task3DataObj.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isSpike ? '#f43f5e' : '#0ea5e9'} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="Media Engagements" name="Media Engagements (Right)" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* TASK 4 */}
          <ChartSection
            id="task4"
            title="Task 4 — Replies, Retweets, and Likes Comparison"
            description="Total volume of the three primary social interactions across all tweets posted between June 1 and August 31, 2020."
            filters={["Tweet time: Jun 1 – Aug 31 2020 (inclusive)"]}
            dataCount={task4DataObj.count}
            accentClass="card-accent-rose"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={task4DataObj.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#212c40" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(33,44,64,0.2)' }} />
                <Legend />
                <Bar dataKey="Count" radius={[4,4,0,0]}>
                  <Cell fill="#0ea5e9" />
                  <Cell fill="#a855f7" />
                  <Cell fill="#f43f5e" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* TASK 5 */}
          <ChartSection
            id="task5"
            title="Task 5 — Monthly Engagement Rate Trend"
            description="Average monthly engagement rate for media tweets vs. non-media tweets across all months present in the dataset."
            filters={["All cleaned tweets (no additional row filter)"]}
            dataCount={task5DataObj.count}
            accentClass="card-accent-amber"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={task5DataObj.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#212c40" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" unit="%" />
                <Tooltip content={<CustomTooltip unit="%" />} />
                <Legend />
                <Line type="monotone" dataKey="Media Tweets"     name="Tweets with Media"    stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="Non-Media Tweets" name="Tweets without Media" stroke="#f59e0b" strokeWidth={3} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartSection>

          {/* TASK 6 */}
          <ChartSection
            id="task6"
            title="Task 6 — Top 10 Tweets by Engagement"
            description="Top 10 tweets ranked by total retweets + likes. Since the dataset has no username column, tweets are identified by their ID (last 8 digits) and a truncated text preview."
            filters={["Exclude Sat/Sun", "Even impressions", "Odd tweetDate", "wordCount < 30"]}
            windows={[{ start: "15:00", end: "17:00" }]}
            overrideTime={overrideTime}
            dataCount={task6DataObj.count}
            accentClass="card-accent-emerald"
          >
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1.5rem', height:'100%', alignItems:'start' }}>
              {/* Horizontal Bar Chart */}
              <div style={{ height: '320px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={task6DataObj.chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#212c40" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis type="category" dataKey="label" stroke="#94a3b8" width={130} tick={{ fontSize: 9 }} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(33,44,64,0.2)' }} />
                    <Legend />
                    <Bar dataKey="engagement" name="Retweets + Likes" fill="#10b981" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Leaderboard table */}
              <div className="custom-table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Tweet ID (last 8)</th>
                      <th>Content Preview</th>
                      <th style={{ textAlign:'right' }}>RTs</th>
                      <th style={{ textAlign:'right' }}>Likes</th>
                      <th style={{ textAlign:'right' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {task6DataObj.tableData.map((item, idx) => (
                      <tr key={item.id}>
                        <td>
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            idx === 1 ? 'bg-slate-300/20 text-slate-300 border border-slate-300/30' :
                            idx === 2 ? 'bg-amber-700/20 text-amber-600 border border-amber-700/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>{idx + 1}</span>
                        </td>
                        <td className="font-mono text-slate-400 text-xs">...{String(item.id).slice(-8)}</td>
                        <td className="text-slate-300" style={{ maxWidth:'200px' }} title={item.fullText}>
                          {item.fullText}
                        </td>
                        <td style={{ textAlign:'right' }} className="text-accent-number text-slate-400">{item.retweets}</td>
                        <td style={{ textAlign:'right' }} className="text-accent-number text-slate-400">{item.likes}</td>
                        <td style={{ textAlign:'right' }} className="text-accent-number font-bold text-emerald-400">{item.engagement}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ChartSection>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ background:'#090d16', borderTop:'1px solid #0f172a', padding:'1.5rem 2rem', marginTop:'3rem', textAlign:'center', fontSize:'0.75rem', color:'#64748b' }}>
        <div style={{ maxWidth:'1400px', margin:'0 auto', display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:'1rem' }}>
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Twitter Campaign Analytics Dashboard
          </div>
          <div>Built with React, Vite &amp; Recharts · Timezone-locked (IST)</div>
        </div>
      </footer>
    </div>
  );
}

export default App;
