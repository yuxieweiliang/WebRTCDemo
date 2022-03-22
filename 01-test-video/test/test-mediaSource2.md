[原文](https://blog.csdn.net/panqisheng/article/details/51470624)

```javascript
  // 判断是否存在mediaSource扩展类 分为pc和移动两种
  window.MediaSource = window.MediaSource || window.WebKitMediaSource;
  // 判断是否支持要解码播放的视频文件编码和类型。
  MediaSource.isTypeSupported('video/webm; codecs=“vorbis,vp8”');//是否支持webm
  MediaSource.isTypeSupported('video/mp4; codecs=“avc1.42E01E,mp4a.40.2”');//是否支持mp4
  MediaSource.isTypeSupported('video/mp2t; codecs=“avc1.42E01E,mp4a.40.2”');//是否支持ts
```

```javascript
  // 该事件是在触发sourceopen监听时进行的，该动作会创建一个sourceBuffer对象用于数据流的播放处理。
  // 如果mediaSource对象无法触发该事件，则无法通过该扩展进行播放的。
  sourceBuffer = mediaSource.addSourceBuffer("DOM string");
  mediaSource.addSourceBuffer('video/mp4; codecs=“avc1.42E01E,mp4a.40.2”');
```


```javascript
    // sourceBuffer对象的方法，用于持续数据的添加播放。
    // Uint8array：媒体二进制数据
    sourceBuffer.appendBuffer(Uint8array);
```


```javascript
  // 类型为TimeRanges，描述了添加进去的所有媒体数据的range信息。
  // 为一个数组，里面标示了持续或间断的时间信息列表。如：
  for(var i=0;i<buffered.length;i++)
  {
    start = buffered.start(i);//第i个range信息的开始时间
    end = buffered.end(i);//第i个range信息的结束时间
  }
```

```javascript
  // 如果播放的媒体数据是连续的则只有一个开始时间点和一个结束时间点。
  // 所以如果要计算缓冲中还存在多少时间则可以通过该描信息与当前播放时间点进行换算。
  function play() {
    if (!this.mediaSource) {
      this.mediaSource = new MediaSource();
      var me = this;
      this.mediaSource.addEventListener('sourceopen', function () {
        me.onMediaSourceOpen();
      });

      this.mediaSource.addEventListener('sourceended', function () {
        me.onMediaSourceEnded();
      });

      this.mediaSource.addEventListener('sourceclose', function () {
        me.onMediaSourceClosed();
      });

      this.mediaSource.addEventListener('error', function () {
        me.onUpdateError();
      });

      this.video = this.createNewVideo();//创建HTMLMediaElement;
      this.video.src = window.URL.createObjectURL(this.mediaSource);
      this.video.play();
    }
    if (!this.sourceBuffer) {
      return;
    }

    if (this.sourceBuffer.updating)//上一块数据还在添加中
    {
      return;
    }

    try {
      this.sourceBuffer.appendBuffer(dataBytes);//添加数据
    }

    catch (err) {
    }
  }
```

```javascript
  function createNewVideo() {
    var newVideo = document.createElement("video");
    newVideo.id = "player";
    newVideo.width = this.videoWidth;
    newVideo.height = this.videoHeight;
    return newVideo;
  }

  //事件侦听
  class SocketEvent {
    onMediaSourceOpen () {
    //DOMString 可以通过转码获得；
      var typeName = 'video/mp2t; codecs=“avc1.64001f”';
      var issurpport = MediaSource.isTypeSupported(typeName);//是否支持
      this.mediaSource.duration = this.totalDuration;//设置视频总时长
      this.sourceBuffer = this.mediaSource.addSourceBuffer(typeName);

    }

    onMediaSourceEnded () {
      console.log("source ended!");
    }

    onMediaSourceClosed () {
      console.log("source closed!");
    }
  }
```
  
#### FMP4封装格式要求
> 在W3C非官方标准文档ISO BMFF Byte Stream Format中明确规定了fmp4媒体文件封装的具体要求。
> fmp4的封装可以分为Initialization Segments和media Segments两种，这两种的基本封装格式相差不多。

#### 关于Initialization Segments必须注意的以下几点：
> 文件类型声明ftyp的box包含的major_brand或者compatible_brand用户代理方必须支持。
> mohd box里的任意box或者字段不能违背在ftyp box里定义的major_brand或者compatible_brands中的任何一个授权。
> mohd中包含的samples的track(如stts,stsc,或者stco 中的entry_count必须被设置成0);
> mvex box必须在moov中被包含，注：该box说明该视频包含moof需要解析。
>
#### media Segments的封装要求基本类似，同时增加了以下几点：
> styp必须遵循ftyp;
> traf里面必须包含tfdt;
> mdat里的samples必须和trun里面的对应。

#### FMP4封装主要box说明
    // BOX：这个box由长度信息和box类型两部分组成，即size，type。size为一个长度数据，描述type里面包含的数据长度。
    // fullbox：继承BOX包含 version（8bit）和flags（24bit）两个数据，版本和格式描述;
    // ftyp,styp：继承BOX，包含3个描述字段:major_brand，minor_version，compatible_brands.
      // 如：0000001C 66747970 6D703432 00000001 69736F6D 6D703432 64617368
      // 其中
      // 0000001C为size长度的16进制32位数据，计算结果为28，即该box的总字节长度；
      // 第二个4个字节66747970为ftyp的code码的16进制数；
      // 第三个4字节数6D703432为major_brand字段值，转化成字符串为mp42；
      // 第四个4字节数00000001为版本标示；
      // 第五，六，七分别描述了一个list数组（69736F6D 6D703432 64617368）为compatible_brands转化为字符串为isommp42dash。
      
      // moov：继承BOX，包含mvhd,mvex,trak,这里有几点需要注意。mvex必须包含，trak下面的stts，stsc，stco里面的entry_count设置成0.
      // mvex：包含：mehd，trex。
      // trex：继承fullbox，包含字段：
        // unsigned int(32) version;//0
        // unsigned int(32) track_ID;//1.视频，2.音频
        // unsigned int(32) default_sample_description_index;//sample描述索引
        // unsigned int(32) default_sample_duration; //默认sample时长 unsigned
        // int(32) default_sample_size;//默认sample大小 unsigned int(32)
        // default_sample_flags//默认sample标示。 以上default_的数据会在moof中没有声明时默认使用。
      // trak:继承BOX，包含的box有tkhd,mdia。
      // tkhd:继承fullbox,包含字段：
        // unsigned int(32) version;//版本，这里默认写成0
        // unsigned int(32) creation_time;//创建时间
        // unsigned int(32) modification_time;//修改时间
        // unsigned int(32) track_ID;//1：视频，2：音频
        // const unsigned int(32) reserved = 0;
        // unsigned int(32) duration;//时长，因为要封装成fmp4，这里写为0；
        // const unsigned int(32)[2] reserved = 0;
        // template int(16) layer = 0;
        // template int(16) alternate_group = 0;
        // template int(16) volume = {if track_is_audio 0x0100 else 0};
        // const unsigned int(16) reserved = 0;
        // template int(32)[9] matrix={ 0x00010000,0,0,0,0x00010000,0,0,0,0x40000000 };
        // // unity matrix
        // unsigned int(32) width;
        // unsigned int(32) height;

  mdia：继承box，包含mdhd，hdlr，minf;

  mdhd：继承fullbox，包含字段：

unsigned int(32) creation_time;//创建时间 unsigned int(32)
  modification_time;//修改时间 unsigned int(32) timescale;//时间比例 unsigned
  int(32) duration;//时长，fmp4可以写为0 bit(1) pad = 0; unsigned int(5)[3]
  language; //写为：0x55C4 code unsigned int(16) pre_defined = 0;

  moof：继承BOX,包含mfhd,traf；

mfhd：继承Fullbox，包含字段：
unsigned int(32) version and flags; unsigned int(32)
  sequence_number;//fragment序列号


  13.traf：包含tfhd,trun,tfdt;
  14.tfhd:继承fullbox，包含字段：
unsigned int(32) version and flags;
  unsigned int(32) track_ID;
  unsigned int(64) base_data_offset;
  unsigned int(32) sample_description_index;
  unsigned int(32) default_sample_duration;
  unsigned int(32) default_sample_size;
  unsigned int(32) default_sample_flags
  字段1版本和标识符值描述：
  * 0x000001 base-data-offset-present//基本数据偏移位置是否出现
  * 0x000002 sample-description-index-present//samplem描述索引是否出现
  * 0x000008 default-sample-duration-present//默认sample时长是否出现
  * 0x000010 default-sample-size-present//默认sample大小是否出现
  * 0x000020 default-sample-flags-present//默认sample标志是否出现
  * 0x010000 duration-is-empty 时长为空（default_sample_duration或者trex里的时长）
0x020000 default-base-is-moof//从每个moof的开始计算偏移

  在这里我们使用0x020000，即每个视频的偏移位置从moof算起。

15.trdt：继承Fullbox，包含字段：

unsigned int(32) version //使用0；
  if (version==1) {
    unsigned int(64) baseMediaDecodeTime;
  } else { // version==0
    unsigned int(32) baseMediaDecodeTime;
  }//所有添加进去的sample解码时长总和。

  16.trun：继承fullbox，这是一个主要字段，描述了各个sample 信息。
字段包括：
unsigned int(32) version and flags;//描述标示
  unsigned int(32) sample_count;//sample数量。
  signed int(32) data_offset;//sample开始偏移
  unsigned int(32) first_sample_flags;//关键标示符
  {
    unsigned int(32) sample_duration;//sample时长
    unsigned int(32) sample_size;//sample大小
    unsigned int(32) sample_flags//sample标示
    if (version == 0)//视频播放时间与解码时间偏移
    { unsigned int(32) sample_composition_time_offset; }
    else
    { signed int(32) sample_composition_time_offset; }
  }[ sample_count ]

  字段1说明：
  * 0x000001:data-offset-present//数据偏移，从moof算起，到 mdat结束。
  * 0x000004:first-sample-flags-present;//关键sample标示是否描述。
  * 0x000100 sample-duration-present: 标示每一个sample有他自己的时长, 否则使用默认值.
  * 0x000200 sample-size-present：每个sample拥有大小，否则使用默认值
  * 0x000400 sample-flags-present：每个sample有他自己的标志，否则使用默认值
  * 0x000800 sample-composition-time-offsets-present; 每个sample 有一个composition time offset
  这里我们根据视频和音频分别采用不同值，标示符的值是有各个要使用的标示值相加获得。
17.mdat:继承Box，视频和音频的主体数据。
字段：bit(8) data[];
  以上是一些基本box的描述，具体细节可以参考INTERNATIONAL STANDARD ISO/IEC 14496-12 里面的详细定义.
  6.FMP4封装中的问题和解决方式
  在fmp4转封装的过程中最基本要注意的是box的描述尽量完整，每个代理方对box的兼容性不同，有的在缺失部分描述信息时依然可以完成播放，而有的则会直接出现解码错误退出播放。
我们这里主要注意几点：
1.initsegment 描述ftyp开头，包含moov,moof,mdat;
  2.mediasegment 描述styp开头,包含moov,moof,mdat；有的浏览器，如safari8.0在没有moov的情况下依然可以流畅的播放视频。但是在chorome浏览器下则会出现解码错误。
3.tfhd：tf_flags 这里使用0x020000，只说明如果base data offset为0时使用trun里面相对于moof的数据偏移信息。该标示在ios5以后的版本中支持。因为我们需要转封装成fmp4，所以应该使用相对于moof的偏移，这样每次append进去的数据才不会在计算起始位置上出现不准确的问题。
4.tfdt box的信息中baseMediaDecodeTime会决定mediaSource里的TimeRange信息的起始。这个值有3种途径获得，1.计算前面添加数据的总时长；2.提取要添加数据的第一个sample时间戳。3.根据ts数据的id信息。
5.trun box的描述：version和flags描述值根据自己的需要计算获得，比如视频数据我们需要描述实际数据偏移（data offset）,关键帧标示（first sample flags）以及每个sample标示符，大小和时间偏移，而这些数据对应的开始标示分别为：0x000001（data offset）,0x000004(first sample flags),0x000200(sample size present),0x000400(sample flags present),0x000800(sample-composition-time-offsets-present).把这些值相加为0xe05(version flags).所以说version flags的值决定了下面描述信息的分析方式。而对于音频数据我们使用0x201，描述信息中只包含数据偏移值和每个sample的大小。

