import{useState as n,useRef as t,useCallback as r,useEffect as u}from"react";export default function(c){var e=c.concurrency;void 0===e&&(e=8);var i=c.done;void 0===i&&(i=function(){});var o=c.inflight;void 0===o&&(o=function(){}),e<1&&(e=Infinity);var f=n(0),a=f[0],s=f[1],v=n(0),h=v[0],d=v[1],p=n(0),g=p[0],l=p[1],m=t([]),b=t([]);return u(function(){for(var n=function(){var n=b.current.shift();d(function(n){return n-1}),m.current.push(n),s(function(n){return n+1}),o(n);var t=n.task();t.then(function(){m.current.pop(n),s(function(n){return n-1}),l(function(n){return n+1}),i(Object.assign({},n,{result:t}))}).catch(function(){m.current.pop(n),s(function(n){return n-1}),l(function(n){return n+1}),i(Object.assign({},n,{result:t}))})};m.current.length<e&&b.current.length>0;)n()},[e,i,o,h,a]),{add:r(function(n){b.current.push(n),d(function(n){return n+1})},[b]),numInFlight:a,numPending:h,numDone:g}}
//# sourceMappingURL=use-async-queue.module.js.map