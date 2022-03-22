onmessage = (e) => {
  onmessage = null; // Clean-up
  eval(e.data);
};
