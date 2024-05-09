// は？

(function () {
  var doc = app.activeDocument;

  // RGBカラースペースのみ許容
  if (doc.documentColorSpace !== DocumentColorSpace.RGB) return;

  // 選択オブジェクト
  var sel = doc.selection;
  if (sel.length < 1) return;

  // デフォルトカラー
  var defaultColor = {
    fill: [255, 255, 255],
    stroke: [0, 0, 0],
  };

  // 初期カラー
  var init = {
    fill: {},
    stroke: {},
  };

  for (var key in init) {
    init[key].colored = true;
    init[key].rgb = (function () {
      var colorObject = extractColor(sel, key);
      if (!colorObject) {
        // 色が？のとき
        init[key].colored = null;
        return defaultColor[key];
      } else {
        var colorArray = getColorArray(colorObject);
        if (colorArray !== null) return colorArray;
        init[key].colored = false;
        return defaultColor[key];
      }
    })();
    init[key].hsl = rgb2hsl(init[key].rgb);
  }

  var swatches = (function () {
    doc.swatches;
  })();

  /*-----------------------------------------
    ウィンドウ作成
  -----------------------------------------*/

  var w = new Window(
    "dialog{\
      text:'HSL',target:'fill',\
      v:Group{size:[54,54], orientation:'none',\
        s:Button{helpTip:'線',size:[36,36],name:'stroke',alignment:['right','bottom']},\
        f:Button{helpTip:'塗り',size:[36,36],name:'fill',alignment:['left','top']},\
        r:Button{helpTip:'塗りと線を入れ替え',size:[12,12],alignment:['right','top']},\
        d:Button{helpTip:'初期設定の塗りと線',size:[12,12],alignment:['left','bottom']},\
      },\
      o:Group{ orientation: 'column',alignChildren : 'left',\
        h:Group{ alignChildren : 'left',\
          label:StaticText{text:'H'},\
          slider: Slider{minvalue:0,maxvalue:360,size:[126,19]},\
          input:EditText {characters:3},\
          unit:StaticText{text:'°'},\
        },\
        s:Group{ alignChildren : 'left',\
          label:StaticText{text:'S'},\
          slider: Slider{minvalue:0,maxvalue:100,size:[126,19]},\
          input:EditText {characters:3},\
          unit:StaticText{text:'%'},\
        },\
        l:Group{ alignChildren : 'left',\
          label:StaticText{text:'L'},\
          slider: Slider{minvalue:0,maxvalue:100,size:[126,19]},\
          input:EditText {characters:3},\
          unit:StaticText{text:'%'},\
        },\
      },\
      css:Group{orientation:'column',alignment:'fill',alignChildren:'fill',\
        n:EditText{properties:{readonly:true}},\
        u:EditText{properties:{readonly:true}},\
        q:EditText{properties:{readonly:true}},\
      },\
      swatch:Panel{alignment:'fill',margins:0,},\
      b:Group{alignChildren:'fill',\
        b0:Button {text:'OK'},\
        b1:Button {text:'Cancel'}\
      },\
    }"
  );

  // ウィンドウ表示前
  w.onShow = function () {
    this.swatch.init();
    this.fill = init.fill;
    this.stroke = init.stroke;
    this.css.n.text = hsl2css(this[this.target].hsl);
    this.css.u.text = rgb2css(this[this.target].rgb);
    this.css.q.text = rgb2hex(this[this.target].rgb);
  };

  /*-----------------------------------------
    色表示部分イベント
  -----------------------------------------*/

  // 塗り・線ボタンの再生成
  w.v.recreate = function (button) {
    if (w.target === button.name) return;
    var clone = this.add("button", button.bounds);
    // 再作成
    w.target = clone.name = button.name; // ネーム
    clone.onClick = button.onClick; // クリックイベント
    clone.onDraw = button.onDraw; // 描画イベント
    // グループをアップデート
    w.o.update();
    // ボタンを一旦消して代入
    this.remove(button);
    button = clone;
    // CSS値の更新
    w.css.update();
  };

  // 再描画
  w.v.redraw = function () {
    this.hide();
    this.show();
  };

  // 塗りボタンのクリックイベント
  w.v.s.onClick = function () {
    this.parent.recreate(this);
  };

  // 線ボタンのクリックイベント
  w.v.f.onClick = function () {
    this.parent.recreate(this);
  };

  // 色の入れ替えボタンのクリックイベント
  w.v.r.onClick = function () {
    var temp = w.stroke;
    w.stroke = w.fill;
    w.fill = temp;
    w.o.update();
    w.css.update();
    w.v.redraw();
  };

  // 塗りボタンの描画
  w.v.f.onDraw = function () {
    var w = this.window;
    var g = this.graphics;
    if (w.target === "fill") {
      w.fill.hsl = [w.o.h.slider.value, w.o.s.slider.value, w.o.l.slider.value];
      w.fill.rgb = hsl2rgb(w.fill.hsl);
    }
    var able = w.fill.colored;
    var color = able ? rgb4brush(w.fill.rgb) : [1, 1, 1];
    var colorBrush = g.newBrush(g.BrushType.SOLID_COLOR, color);
    var blackPen = g.newPen(g.BrushType.SOLID_COLOR, rgb4brush(45), 1);
    var whitePen = g.newPen(g.BrushType.SOLID_COLOR, [1, 1, 1], 1);
    var redPen = g.newPen(g.BrushType.SOLID_COLOR, [1, 0, 0], 2);
    var grayBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(83));
    var aside = this.size.width;
    // 背景
    g.newPath();
    g.rectPath(0, 0, aside, aside);
    if (able === null) {
      // ?の場合
      g.fillPath(grayBrush);
      var strPen = g.newPen(g.BrushType.SOLID_COLOR, rgb4brush(220), 2);
      var font1 = ScriptUI.newFont("", undefined, 17);
      g.drawString("?", strPen, 14, 8, font1);
    } else {
      g.fillPath(colorBrush);
      if (able) {
        // 白枠
        g.newPath();
        g.rectPath(1.5, 1.5, aside - 3, aside - 3);
        g.strokePath(whitePen);
      } else {
        // 斜線
        g.newPath();
        g.moveTo(aside, 0);
        g.lineTo(0, aside);
        g.strokePath(redPen);
      }
    }
    // 黒枠
    g.newPath();
    g.rectPath(0.5, 0.5, aside - 1, aside - 1);
    g.strokePath(blackPen);
  };

  // 線ボタンの描画
  w.v.s.onDraw = function () {
    var w = this.window;
    var g = this.graphics;
    if (w.target === "stroke") {
      w.stroke.hsl = [w.o.h.slider.value, w.o.s.slider.value, w.o.l.slider.value];
      w.stroke.rgb = hsl2rgb(w.stroke.hsl);
    }
    var able = w.stroke.colored;
    var color = able ? rgb4brush(w.stroke.rgb) : [1, 1, 1];
    var colorBrush = g.newBrush(g.BrushType.SOLID_COLOR, color);
    var blackPen = g.newPen(g.BrushType.SOLID_COLOR, rgb4brush(45), 1);
    var whitePen = g.newPen(g.BrushType.SOLID_COLOR, [1, 1, 1], 1);
    var redPen = g.newPen(g.BrushType.SOLID_COLOR, [1, 0, 0], 2);
    var grayBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(83));
    var aside = this.size.width;
    // 背景
    g.newPath();
    g.rectPath(0, 0, aside, aside);
    g.fillPath(able === null ? grayBrush : colorBrush);
    // 抜き
    g.newPath();
    g.rectPath(10.5, 10.5, aside - 21, aside - 21);
    g.fillPath(grayBrush);
    g.strokePath(blackPen);
    if (able === null) {
      // ?の場合
      var strPen = g.newPen(g.BrushType.SOLID_COLOR, rgb4brush(220), 2);
      var font1 = ScriptUI.newFont("", undefined, 10);
      g.drawString("?", strPen, 2.5, 0, font1);
      g.drawString("?", strPen, aside - 7.5, 0, font1);
      g.drawString("?", strPen, 2.5, aside - 12.5, font1);
      g.drawString("?", strPen, aside - 7.5, aside - 12.5, font1);
    } else if (able) {
      // 白枠
      g.newPath();
      g.rectPath(1.5, 1.5, aside - 3, aside - 3);
      g.strokePath(whitePen);
      // 抜き白枠
      g.newPath();
      g.rectPath(9.5, 9.5, aside - 19, aside - 19);
      g.strokePath(whitePen);
    } else {
      // 斜線
      g.newPath();
      g.moveTo(aside, 0);
      g.lineTo(0, aside);
      g.strokePath(redPen);
    }
    // 黒枠
    g.newPath();
    g.rectPath(0.5, 0.5, aside - 1, aside - 1);
    g.strokePath(blackPen);
  };

  // 入れ替えボタンの描画
  w.v.r.onDraw = function () {
    var g = this.graphics;
    var grayBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(192));
    var grayPen = g.newPen(g.BrushType.SOLID_COLOR, rgb4brush(192), 2);
    var aside = this.size.width;
    g.newPath();
    g.moveTo(3, 0);
    g.lineTo(3, 6);
    g.lineTo(0, 3);
    g.closePath();
    g.moveTo(12, 9);
    g.lineTo(9, 12);
    g.lineTo(6, 9);
    g.closePath();
    g.fillPath(grayBrush);
    g.newPath();
    g.moveTo(3, 3);
    for (var i = 0, r = 3, l = 4; i < l; i++) {
      var theta = (Math.PI / 2) * (1 - i / (l - 1));
      var x = 9 - r + r * Math.cos(theta);
      var y = 3 + r - r * Math.sin(theta);
      g.lineTo(x, y);
    }
    g.lineTo(9, 9);
    g.strokePath(grayPen);
  };

  // 初期色ボタンの描画
  w.v.d.onDraw = function () {
    var g = this.graphics;
    var grayBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(192));
    var blackBrush = g.newBrush(g.BrushType.SOLID_COLOR, [0, 0, 0]);
    var whiteBrush = g.newBrush(g.BrushType.SOLID_COLOR, [1, 1, 1]);
    g.newPath();
    g.rectPath(0, 0, 9, 9);
    g.fillPath(grayBrush);
    g.newPath();
    g.rectPath(3, 3, 9, 9);
    g.fillPath(grayBrush);
    g.newPath();
    g.rectPath(4, 4, 7, 7);
    g.fillPath(blackBrush);
    g.newPath();
    g.rectPath(6, 6, 3, 3);
    g.fillPath(grayBrush);
    g.newPath();
    g.rectPath(1, 1, 7, 7);
    g.fillPath(blackBrush);
    g.newPath();
    g.rectPath(2, 2, 5, 5);
    g.fillPath(whiteBrush);
  };

  /*-----------------------------------------
    操作部分のイベント
  -----------------------------------------*/

  // 値を更新
  w.o.update = function () {
    var children = w.o.children;
    for (var i = 0; i < children.length; i++) {
      children[i].input.text = w[w.target].hsl[i];
      children[i].slider.value = w[w.target].hsl[i];
      children[i].slider.redraw();
    }
  };

  w.shiftOn = false;

  // 各操作のイベント
  for (var i = 0; i < 3; i++) {
    var p = w.o.children[i],
      slider = p.slider,
      input = p.input;
    slider.value = init.fill.hsl[i];
    input.text = init.fill.hsl[i];
    p.id = i; // インデックス
    p.memo = p.slider.value; // 記録

    p.update = function () {
      // 色を有効にする
      if (!w[w.target].colored) w[w.target].colored = true;
      // 他のスライダー再描画
      for (var i = 0; i < w.o.children.length; i++) {
        if (i === this.id) continue;
        w.o.children[i].slider.redraw();
      }
      // 色表示再描画
      w.v.redraw();
      w.css.update();
    };

    // スライダーの再描画
    slider.redraw = function () {
      this.hide();
      this.show();
    };

    // Slider描画
    slider.onDraw = function () {
      var w = this.window;
      var g = this.graphics;
      var sl = g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(194));
      var m = 7.5; // マージン
      var width = this.size.width - m * 2; // スケール部分の長さ
      var hsl = w[w.target].hsl.concat();
      g.newPath();
      g.rectPath(m - 1, 6, width + 2, 6);
      g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(93)));
      // スケール部分
      for (var i = 0; i < width; i++) {
        hsl[this.parent.id] = (this.maxvalue / width) * i;
        var rgb = hsl2rgb(hsl);
        g.newPath();
        g.rectPath(m + i, 7, 1, 4);
        g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(rgb)));
      }
      // スライダー部分
      var s = m + (this.value / this.maxvalue) * width;
      g.newPath();
      g.moveTo(s, 11);
      g.lineTo(s + 4.5, 15);
      g.lineTo(s + 4.5, 19);
      g.lineTo(s + -4.5, 19);
      g.lineTo(s + -4.5, 15);
      g.closePath();
      g.fillPath(sl);
    };

    // Slider操作中のイベント
    slider.onChanging = function () {
      // 数値の正規化
      this.value = Math.round(this.value);
      this.parent.input.text = this.value;
      this.parent.update();
    };

    // Slider操作後のイベント
    slider.onChange = function () {
      this.parent.memo = this.value;
    };

    // Sliderキーボードイベント（押してるとき）（イラレにはない
    slider.addEventListener("keydown", function (e) {
      if (e.keyName === "Up" || e.keyName === "Down" || e.keyName === "Left" || e.keyName === "Right") {
        this.onChanging();
      }
    });

    // Sliderキーボードイベント（押してるとき）
    slider.addEventListener("keyup", function (e) {
      if (e.keyName === "Up" || e.keyName === "Down" || e.keyName === "Left" || e.keyName === "Right") {
        this.onChange();
      }
    });

    // EditText入力中のイベント
    input.onChanging = function () {
      var slider = this.parent.slider;
      // 数値の正規化
      if (isNaN(this.text)) {
        slider.value = this.parent.memo;
      } else if (this.text > slider.maxvalue) {
        slider.value = slider.maxvalue;
      } else {
        slider.value = this.text;
      }
      this.parent.update();
    };

    // EditText入力後のイベント
    input.onChange = function () {
      this.text = this.parent.slider.value;
      this.parent.slider.onChange();
    };

    // EditTextキーボードイベント（押してるとき）
    input.addEventListener("keydown", function (e) {
      // Tabキーの挙動
      if (e.keyName === "Tab") {
        e.preventDefault();
        var children = this.parent.parent.children;
        var target = this.parent.id === children.length - 1 ? 0 : this.parent.id + 1;
        children[target].input.active = true;
      }
      // Shiftキーの挙動
      if (e.keyName === "Shift") w.shiftOn = true;
      // 増減値
      var fluc = w.shiftOn ? 10 : 1;
      // 増
      if (e.keyName === "Up" || e.keyName === "Right") {
        e.preventDefault();
        var max = this.parent.slider.maxvalue;
        if (this.text === max) return;
        var newValue = Math.floor(this.text / fluc) * fluc + fluc;
        this.text = newValue >= max ? max : newValue;
        this.onChanging();
      }
      // 減
      if (e.keyName === "Down" || e.keyName === "Left") {
        e.preventDefault();
        var min = this.parent.slider.minvalue;
        if (this.text === min) return;
        var newValue = Math.ceil(this.text / fluc) * fluc - fluc;
        this.text = newValue <= min ? min : newValue;
        this.onChanging();
      }
    });

    // EditTextキーボードイベント（離したとき）
    input.addEventListener("keyup", function (e) {
      if (e.keyName === "Shift") w.shiftOn = false;
      if (e.keyName === "Up" || e.keyName === "Right" || e.keyName === "Down" || e.keyName === "Left") {
        this.onChange();
      }
    });
  }

  /*-----------------------------------------
    CSS出力部分のイベント
  -----------------------------------------*/

  // 値の更新
  w.css.update = function () {
    this.n.text = hsl2css(w[w.target].hsl);
    this.u.text = rgb2css(w[w.target].rgb);
    this.q.text = rgb2hex(w[w.target].rgb);
  };

  /*-----------------------------------------
    スウォッチ部分のイベント
  -----------------------------------------*/

  w.swatch.init = function () {
    // スウォッチ取得
    var swatches = (function () {
      var groups = doc.swatchGroups;
      var result = [];
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        result.push({
          name: group.name,
          list: (function () {
            var list = group.getAllSwatches();
            for (var i = 0; i < list.length; i++) {
              var swatch = list[i];
              var type = swatch.color.typename;
              if (type === "RGBColor" || type === "GrayColor") continue;
              list.splice(i, 1);
            }
            return list;
          })(),
        });
      }
      return result;
    })();

    // パネルのリサイズ
    var w = this.window;
    var m = 1;
    var a = 13;
    var d = m + a;
    var max = this.size[0];
    this.size[1] = (function () {
      var y = 0;
      for (var i = 0; i < swatches.length; i++) {
        var c = i > 0 ? 1 : 0;
        var w = (swatches[i].list.length + c) * d;
        y += Math.ceil(w / max) * d;
      }
      return y + (4 - m);
    })();
    w.layout.resize();

    // ボタン作成
    var x = 0;
    var y = 0;
    for (var i = 0; i < swatches.length; i++) {
      if (i > 0) {
        var icon = this.add("staticText", [0, y, 0 + a, y + a]);
        icon.helpTip = swatches[i].name;
        icon.onDraw = function () {
          var w = this.window;
          var g = this.graphics;
          var aside = this.size.width;
          var grayBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(194));
          var grayPen = g.newPen(g.BrushType.SOLID_COLOR, rgb4brush(194), 1);
          var backBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(83));
          g.newPath();
          g.rectPath(1, 4, 11, 7);
          g.fillPath(grayBrush);
          g.newPath();
          g.moveTo(1.5, 2.5);
          g.lineTo(4.5, 2.5);
          g.lineTo(7.5, 5.5);
          g.lineTo(1.5, 5.5);
          g.closePath();
          g.fillPath(backBrush);
          g.strokePath(grayPen);
        };
        x = d;
      } else {
        x = 0;
      }
      var list = swatches[i].list;
      for (var j = 0; j < list.length; j++) {
        if (x > max - a) {
          x = 0;
          y += d;
        }
        var swatch = list[j];
        var button = this.add("button", [x, y, x + a, y + a]);
        button.helpTip = swatch.name;
        button.rgb = getColorArray(swatch.color);
        // ボタンのクリックイベント
        button.onClick = function () {
          var w = this.window;
          w[w.target].colored = true;
          w[w.target].rgb = this.rgb;
          w[w.target].hsl = rgb2hsl(this.rgb);
          w.o.update();
          w.css.update();
          w.v.redraw();
        };
        // ボタンの描画
        button.onDraw = function () {
          var w = this.window;
          var g = this.graphics;
          var aside = this.size.width;
          var colorBrush = g.newBrush(g.BrushType.SOLID_COLOR, rgb4brush(this.rgb));
          // 黒枠
          g.newPath();
          g.rectPath(0, 0, aside, aside);
          g.fillPath(colorBrush);
        };
        x += d;
      }
      y += d;
    }
  };

  /*-----------------------------------------
    表示
  -----------------------------------------*/

  // 戻り値が1以外なら終了
  if (w.show() != 1) return;

  /*-----------------------------------------
    最終処理
  -----------------------------------------*/

  // 色変更
  colorised(sel, w.fill.rgb, w.stroke.rgb);
})();

/********************************************
*********************************************
  各種関数
*********************************************
*********************************************/

// RGB配列からHSL配列に変換
function rgb2hsl(arr) {
  var r = arr[0],
    g = arr[1],
    b = arr[2];
  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var l = ((max + min) / 2 / 255) * 100;
  if (max === min) return [0, 0, l];
  var h = (function () {
    if (max === r) return 60 * ((g - b) / (max - min));
    else if (max === g) return 60 * ((b - r) / (max - min)) + 120;
    else if (max === b) return 60 * ((r - g) / (max - min)) + 240;
    else return 0;
  })();
  if (h < 0) h += 360;
  var s = (function () {
    if ((max + min) / 2 < 128) return ((max - min) / (max + min)) * 100;
    else return ((max - min) / (510 - max - min)) * 100;
  })();
  return roundArray([h, s, l], 2);
}

// HSL配列からRGB配列に変換
function hsl2rgb(arr) {
  var h = arr[0],
    s = arr[1],
    l = arr[2];
  var conf = (l < 50 ? l : 100 - l) * (s / 100);
  var max = 2.55 * (l + conf);
  var min = 2.55 * (l - conf);
  var rgb;
  if (h < 60) rgb = [max, (h / 60) * (max - min) + min, min];
  else if (h < 120) rgb = [((120 - h) / 60) * (max - min) + min, max, min];
  else if (h < 180) rgb = [min, max, ((h - 120) / 60) * (max - min) + min];
  else if (h < 240) rgb = [min, ((240 - h) / 60) * (max - min) + min, max];
  else if (h < 300) rgb = [((h - 240) / 60) * (max - min) + min, min, max];
  else rgb = [max, min, ((360 - h) / 60) * (max - min) + min];
  return roundArray([rgb[0], rgb[1], rgb[2]], 2);
}

// HSL配列をCSSに変換
function hsl2css(arr) {
  return "hsl(" + arr[0] + " " + arr[1] + "% " + arr[2] + "%)";
}

// RGB配列をCSSに変換
function rgb2css(arr) {
  return "rgb(" + arr[0] + " " + arr[1] + " " + arr[2] + ")";
}

// RGBをHEXに変換
function rgb2hex(arr) {
  for (var i = 0, hex = "#"; i < arr.length; i++) {
    var num = Math.round(arr[i]).toString(16);
    hex += num.length === 1 ? "0" + num : num;
  }
  return hex;
}

// RGB配列をブラシ用に変換（%から小数へ
function rgb4brush(arg) {
  var arr = typeof arg === "number" ? [arg, arg, arg] : arg;
  return [arr[0] / 255, arr[1] / 255, arr[2] / 255];
}

// 配列を丸める（小数点以下第n位まで
function roundArray(arr, n) {
  if (n === -1) return arr;
  if (typeof n === "undefined") n = 0;
  var res = arr.concat();
  var c = Math.pow(10, n);
  for (var i = 0; i < arr.length; i++) {
    res[i] = Math.round(res[i] * c) / c;
  }
  return res;
}

// カラーオブジェクトに変換
function rgb2colorObj(arr) {
  var color = new RGBColor();
  color.red = arr[0];
  color.green = arr[1];
  color.blue = arr[2];
  return color;
}

// 選択オブジェクトの色の取得
function extractColor(items, target, sourceColor) {
  var prop = target + "Color";
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var type = item.typename;
    if (type === "GroupItem") {
      var result = extractColor(item.pageItems, target, sourceColor);
      if (!result) return false;
    } else if (type === "CompoundPathItem" || type === "PathItem") {
      var currentColor = type === "CompoundPathItem" ? item.pathItems[0][prop] : item[prop];
      // 初回の色を設定
      if (sourceColor === undefined) {
        if (currentColor) sourceColor = currentColor;
        continue;
      }
      // 色の比較
      if (!compareColorObject(sourceColor, currentColor)) return false;
    }
  }
  return sourceColor;
}

// 色オブジェクトの比較
function compareColorObject(a, b) {
  if (a.typename !== b.typename) return false;
  for (var key in a) {
    if (key === "typename") continue;
    if (a[key] !== b[key]) return false;
  }
  return true;
}

//　色オブジェクトを配列化
function getColorArray(color) {
  var type = color.typename;
  if (type === "RGBColor") {
    return [color.red, color.green, color.blue];
  } else if (type === "NoColor") {
    return null;
  } else if (type === "GrayColor") {
    var cvpo = (1 - color.gray / 100) * 255;
    return [cvpo, cvpo, cvpo];
  }
}

// 最終処理用
function colorised(arr, fill, stroke) {
  for (var i = 0; i < arr.length; i++) {
    var current = arr[i];
    var type = current.typename;
    if (type === "Groupitem") {
      colorised(current.pageItems, fill, stroke);
      continue;
    }
    var target = type === "CompoundPathItem" ? current.pathItems[0] : current;
    if (fill === null) {
      current.filled = false;
    } else {
      current.filled = true;
      current.fillColor = rgb2colorObj(fill);
    }
    if (stroke === null) {
      current.stroked = false;
    } else {
      current.stroked = true;
      current.strokeColor = rgb2colorObj(stroke);
    }
  }
}

function getSwatach() {}
