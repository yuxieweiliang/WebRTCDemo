const BASE_DATASETS = '';
class DynamicWorker {
  constructor(worker) {
    /**
     * 依赖的全局变量声明
     * 如果 BASE_DATASETS 非字符串形式，可调用 JSON.stringify 等方法进行处理
     * 保证变量的正常声明
     */
    const CONSTS = `const base = ${BASE_DATASETS || '""'};\n`;

    /**
     * 数据处理函数
     */
    const formatFn = `const formatFn = ${worker.toString()};\n`;

    /**
     * 内部 onmessage 处理
     */
    const onMessageHandlerFn = `self.onmessage = ({ data: { data, flag } }) => {
            console.log('Message received from main script', data);
            const {method} = data;
            if (data.data && method === 'format') {
              self.postMessage({
                data: formatFn(data.data),
                flag
              });
            }
            console.log('Posting message back to main script');
      }\n`;

    /**
     * 返回结果
     */
    const handleResult = ({ data: { data, flag } }) => {
      let resolve = this.flagMapping[flag];

      if (resolve) {
        resolve(data);
        resolve = null;
        delete this.flagMapping[flag];
      }
    };

    const blob = new Blob(
      [
        CONSTS,
        formatFn,
        onMessageHandlerFn
      ],
      { type: 'text/javascript' }
    );
    const url = URL.createObjectURL(blob);
    this.flagMapping = {};
    this.worker = new Worker(url);
    this.worker.addEventListener('message', handleResult);

    URL.revokeObjectURL(url);
  }

  /**
   * 动态调用
   */
  send(data) {
    const flag = new Date().toString();

    this.worker.postMessage({ data, flag });

    return new Promise((res) => {
      this.flagMapping[flag] = res;
    })
  }

  close() {
    this.worker.terminate()
  }
}
