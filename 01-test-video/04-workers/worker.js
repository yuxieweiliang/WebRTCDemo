const create = func => {
  if (func instanceof Worker) return func;
  if (typeof func === 'string' && func.endsWith('.js')) return new Worker(func);

  if (typeof func === 'function') {
    const code = [
      `self.injectFn = ${ func.toString() };\n`,
      'self.onmessage = (e) => {\n',
      ' const result = self.injectFn(e.data);\n',
      ' self.postMessage(result);\n',
      '}'
    ];

    const blob = new Blob(code, { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    worker.cleanup = () => {
      URL.revokeObjectURL(url);
      worker.terminate();
    };

    return worker
  } else {
    console.error('参数必须是一个函数')
  }
};

const useWorker = (f, i) => {
  const worker = create(f);

  if (!worker) {
    throw new Error('Need correctly parameter!');
  }

  worker.postMessage(i);

  return new Promise((resolve, reject) => {
    worker.onmessage = e => {
      if (worker.cleanup) worker.cleanup();
      resolve(e.data);
    };

    worker.onerror = e => {
      if (worker.cleanup) worker.cleanup();
      reject(e.message);
    };

    worker.onmessageerror = (e) => {
      if (worker.cleanup) worker.cleanup();
      reject(e.message);
    };
  });
};

