import EventEmitter from "events";
import Stream from './stream'

export default class Mp4Player extends EventEmitter {
  constructor(url, options) {
    super();
    this.stream = new Stream(url, this);
  }
}
