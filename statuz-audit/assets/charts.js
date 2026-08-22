(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();
  var ok = style.getPropertyValue('--ok').trim();
  var warn = style.getPropertyValue('--warn').trim();
  var red = style.getPropertyValue('--red').trim();

  window.addEventListener('resize', function() {
    if (window.__chartGap) window.__chartGap.resize();
  });

  // Chart: 已实现 vs 空置 —— 两段式现状
  var gap = echarts.init(document.getElementById('chart-gap'), null, { renderer: 'svg' });
  window.__chartGap = gap;

  // 模拟"完成度"数据：每层 Statuz 承诺能力的完成百分比（基于源码扫描的主观评级，从下往上 = 从接近现实到接近 agent）
  var layers = [
    '向 agent 释放状态 (release)',
    '语义解释 (niche)',
    '状态演化 Loop',
    '从现实建图 (arrow-map)',
    '跨字段查询',
    '五核心查询',
    'Cluster/Field/Bridge',
    '图引擎',
    '存储管线'
  ];
  var values = [0, 0, 0, 0, 100, 100, 100, 100, 100];
  var colors = values.map(function(v) { return v === 0 ? red : v === 100 ? ok : warn; });

  gap.setOption({
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendToBody: true
    },
    grid: { left: '8%', top: '6%', right: '18%', bottom: '4%', containLabel: true },
    xAxis: {
      type: 'value',
      min: 0, max: 100,
      axisLabel: { color: muted, formatter: '{value}%' },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } }
    },
    yAxis: {
      type: 'category',
      data: layers,
      axisLabel: { color: ink, fontSize: 12 },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: values.map(function(v, i) {
        return { value: v, itemStyle: { color: colors[i], borderRadius: v === 0 ? [0,2,2,0] : [0,12,12,0] } };
      }),
      barWidth: 16,
      label: {
        show: true,
        position: 'right',
        color: muted,
        fontFamily: 'GeistMono',
        fontSize: 11,
        formatter: function(p) { return p.value === 0 ? '0% · 空置' : (p.value === 100 ? '100% · 已实现' : p.value + '%'); }
      },
      markLine: {
        symbol: 'none',
        label: { formatter: 'Statuz 对外承诺在此之上', color: red, fontSize: 11 },
        lineStyle: { color: red, type: 'dashed' },
        data: [{ xAxis: 100 }]
      }
    }]
  });
})();