// replaces https://github.com/emscripten-core/emscripten/blob/main/src/wasm_worker.js
// to support modules
// see https://github.com/emscripten-core/emscripten/issues/17664

'use strict';

onmessage = function(d) {
  const waiting=[];
  const listener = (ev)=>waiting.push(ev);

  onmessage=null;
  this.addEventListener("message", listener);

  d = d.data;
  d['instantiateWasm'] = (info, receiveInstance) => {
		return receiveInstance(new WebAssembly.Instance(d['wasm'], info), d['wasm']);
	};

  console.log(d.js);
  import(d.js).then(x=>{
    this.removeEventListener("message", listener);
    const ret = x.default.call(this,d); // module creates its own message queue
    waiting.forEach(ev=>this.dispatchEvent(ev));
    return ret;
  }).then(()=>{
    d.wasm = d.mem = d.js = 0;
  }).catch(err=>{
		// not great error handling but i dont have access any modules presumably
		console.error(`couldn't initialize wasm module on web worker`, err, d);
	});
}