<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  export let voteShares = {};
  export let sampleSize = 50;
  export let sims = 1000;
  export let width = 240;
  export let height = 240;

  let parties = Object.keys(voteShares);
  let probs = parties.map(p => (voteShares[p] || 0));
  const total = probs.reduce((a,b) => a+b, 0) || 100;
  probs = probs.map(v => v / total);

  let stats = [];

  function simulateOnce(n, probs){
    const k = probs.length;
    const counts = new Array(k).fill(0);
    for(let i=0;i<n;i++){
      const r = Math.random();
      let cum = 0;
      for(let j=0;j<k;j++){
        cum += probs[j];
        if(r < cum){ counts[j]++; break; }
      }
    }
    return counts.map(c => c / n);
  }

  function quantile(arr, q){
    const a = arr.slice().sort((x,y)=>x-y);
    const pos = (a.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if(a[base+1] !== undefined) return a[base] + rest * (a[base+1] - a[base]);
    return a[base];
  }

  let mounted = false;

  onMount(() => {
    run();
    mounted = true;
  });

  function run(){
    const n = Math.max(1, +sampleSize);
    const iters = Math.max(1, +sims);
    const k = probs.length;
    const accum = Array.from({length:k}, ()=>[]);
    for(let t=0;t<iters;t++){
      const draw = simulateOnce(n, probs);
      for(let j=0;j<k;j++) accum[j].push(draw[j]);
    }
    stats = parties.map((p, idx) => {
      const arr = accum[idx];
      const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
      const sd = Math.sqrt(arr.reduce((a,b)=>a+(b-mean)*(b-mean),0)/(arr.length-1 || 1));
      const ci_low = quantile(arr, 0.025);
      const ci_high = quantile(arr, 0.975);
      return { party: p, mean, sd, ci: [ci_low, ci_high] };
    });
  }
  // rendering helpers (use same d3 import above)
  function escapeHtml(str){
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function renderSlices(stats){
    const total = stats.reduce((s,x)=>s+x.mean,0) || 1;
    const data = stats.map(s=>s.mean/total);
    const pie = d3.pie().sort(null);
    const arcs = pie(data);
    const radius = 80;
    const inner = 40;
    const arcGen = d3.arc().innerRadius(inner).outerRadius(radius);
    const palette = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#F97316','#8B5CF6'];
    const parts = arcs.map((a,i)=>`<path d="${arcGen(a)}" fill="${escapeHtml(palette[i % palette.length])}" stroke="#fff" stroke-width="1"></path>`).join('');
    const legend = stats.map((s,i)=>`<text x="0" y="${i*16}" font-size="12">${escapeHtml(s.party)}: ${(s.mean*100).toFixed(1)}% (±${(s.sd*100).toFixed(2)}%)</text>`).join('');
    return parts + `<g transform="translate(-${radius+10},-${radius})">${legend}</g>`;
  }

</script>

<svg {width} {height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
  <g transform={`translate(${width/2},${height/2})`}>
    {#if mounted}
      {#if stats.length}
        {@html renderSlices(stats)}
      {/if}
    {:else}
      {@html renderSlices(parties.map(p => ({ party: p, mean: (voteShares[p] || 0) / 100, sd: 0 })))}
    {/if}
  </g>
</svg>
