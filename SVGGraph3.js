/* SVGGraph.js ver1.24
==============
本スクリプトはwebブラウザ上で二次元関数グラフを描画するためのものです．
少ない記述で関数グラフを記述することが出来ます．

基本となるアイディアはPeter Jipsen氏のASCIIsvg.js
http://www.chapman.edu/~jipsen/svg/ASCIIsvg.js
から得ていますが，コードは全てスクラッチから記述しています．

動作環境:
firefox,chrome,opera,ie9+等(html5をサポートするブラウザ)
※ie8以前では動作しません．

The MIT License (MIT)

Copyright (c) 2013-2014 defghi1977(http://defghi1977-onblog.blogspot.jp/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

以下に定める条件に従い、本ソフトウェアおよび関連文書のファイル（以下「ソフトウェア」）の複製を取得するすべての人に対し、ソフトウェアを無制限に扱うことを無償で許可します。これには、ソフトウェアの複製を使用、複写、変更、結合、掲載、頒布、サブライセンス、および/または販売する権利、およびソフトウェアを提供する相手に同じことを許可する権利も無制限に含まれます。

上記の著作権表示および本許諾表示を、ソフトウェアのすべての複製または重要な部分に記載するものとします。

ソフトウェアは「現状のまま」で、明示であるか暗黙であるかを問わず、何らの保証もなく提供されます。ここでいう保証とは、商品性、特定の目的への適合性、および権利非侵害についての保証も含みますが、それに限定されるものではありません。 作者または著作権者は、契約行為、不法行為、またはそれ以外であろうと、ソフトウェアに起因または関連し、あるいはソフトウェアの使用またはその他の扱いによって生じる一切の請求、損害、その他の義務について何らの責任も負わないものとします。
*/

//non strict関数
//NOTE:use strictの関数とは混在できないため分離して管理する．
var SVGGraphNonStrict = (function(){
	//関数文字列をfunctionとして実行可能とする．
	function toFunction(source, paramName, Math, mathjs, svg){
		var func;
		var m = Math;
		with(Math){eval("func = function(" + paramName + "){return " + mathjs(source) + ";};");}
		return func;
	}
	//文字列を数値にして返す．
	function toValue(source, Math, mathjs, svg){
		if(typeof source == "number" || source instanceof Object){return source;}
		if(source === undefined || source === null || source == ""){return;}
		var result;
		var m = Math;
		with(Math){eval("result = " + mathjs(source) + ";");}
		//型チェック
		//NOTE:誤ってHTMLElementを参照するケースがある
		switch(typeof result){
			case "string": case "number": case "boolean":
				break;
			default:
				if(result instanceof Array){
					break;
				}
				throw "TypeError:" + source + " is not available.";
		}
		return result;
	}
	return {
		toFunction: toFunction,
		toValue: toValue
	};
})();
Object.freeze(SVGGraphNonStrict);

//モジュール本体
var SVGGraph = (function(){
	"use strict";

	//svgの利用可否判定
	var isSVGAvailable = !document.createElementNS 
		? false 
		: document.createElementNS("http://www.w3.org/2000/svg", "svg").viewBox !== undefined;
	if(!isSVGAvailable){return;}
	
	var SVG_NS = "http://www.w3.org/2000/svg";
	var XHTML_NS = "http://www.w3.org/1999/xhtml";
	
	//利用を終了した要素をキャッシュする
	var elemCache = {};
	function cacheElem(name, elem){
		//属性を全て削除
		var attrs = elem.attributes;
		for(var i = attrs.length-1; i>=0; i--){
			var attr = attrs[i];
			if(attr.name == "d"){
				elem.setAttribute(attr.name, "M0,0");//NOTE:chrome対策
			}else{
				elem.setAttribute(attr.name, "");//NOTE:ie対策
				elem.removeAttribute(attr.name);
			}
		}
		var list = elemCache[name];
		if(!list){
			list = [];
			elemCache[name] = list;
		}
		list.push(elem);
	}

	//ノードを生成する
	var templates = {};
	function getElem(name, attributes){
		var result;
		//使用済み要素を再利用する
		var freeList = elemCache[name];
		if(freeList && freeList.length>0){
			result = freeList.pop();
		}
		//見つからなかった場合
		if(!result){
			//テンプレートを探す
			var template = templates[name];
			if(!template){
				//見つからなければテンプレートとして登録する．
				template = document.createElementNS(SVG_NS, name);
				templates[name] = template;
			}
			result = template.cloneNode(false);
		}
		//自動生成の識別子を追加
		result.setAttribute("auto-created", "true");
		//初期値の設定
		return insertAttributes(result, attributes);
	}
	
	//HTML要素を生成する
	function getXHTMLElem(name, attributes){
		var elem = document.createElementNS(XHTML_NS, name);
		elem.setAttribute("auto-created", "true");
		return insertAttributes(elem, attributes);
	}

	//属性値を挿入する
	function insertAttributes(elem, attributes){
		if(attributes){
			for(var i in attributes){
				elem.setAttribute(i, attributes[i]);
			}
		}
		return elem;
	}

	//関数群
	var Math = (function(){
		//window.Mathオブジェクトのクローンを作る
		var obj = {};
		//定数
		push(["E", "LN2", "LN10", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"]);
		//関数
		push(["abs", "acos", "asin", "atan", "atan2", 
			"ceil", "cos", "exp", "floor", "imul", 
			"log", "max", "min", "pow", "random", 
			"round", "sin", "sqrt", "tan"]);
		//Mathオブジェクトから関数をコピーする．
		function push(arr){
			for(var i = 0, len = arr.length; i<len; i++){
				obj[arr[i]] = window.Math[arr[i]];
			}
		}
		return obj;
	})();
	//独自関数・定数の追加
	function registerMath(name, f){
		var m = Math;
		if(typeof f == "function"){
			var g;
			var s = "g=" + f.toString() + ";";
			eval(s);
			Math[name] = g;
		}else{
			Math[name] = f;
		}
	}

	//マクロ
	var _Macro = {};
	//マクロの登録
	function registerMacro(name, f){
		_Macro[name] = f;
	}
	
	//初期設定・終了設定
	var _pre = function(){};
	function registerPresetting(f){
		_pre = f;
	}
	var _post = function(){};
	function registerPostsetting(f){
		_post = f;
	}

	//マーカー
	var Marker = {none: getElem("rect")};
	//マーカーを登録する
	function registerMarker(source, blackCaseName, whiteCaseName){
		if(blackCaseName === undefined || whiteCaseName === undefined){return;}
		var elem;
		if(typeof source == "string"){
			elem = getElem("path", {d: source});
		}else{
			elem = source.cloneNode(false);
		}
		Marker[blackCaseName] = elem;
		Marker[whiteCaseName] = elem.cloneNode(false);
		elem.isBlackCase = true;
	}

	//デフォルトのマーカーを登録する
	(function(){
		registerMarker(getElem("polygon", {points: "-5,0 -3,5 -5,10 5,5"}), "arrow", "warrow");
		registerMarker(getElem("circle", {cx: "5", cy:"5", r: "4"}), "dot", "circle");
		registerMarker(getElem("polygon", {points: "5,0 10,5 5,10 0,5"}), "dia", "wdia");
	})();

	//文字列位置の水平位置を取得する
	function toHPos(pos){
		switch(pos){
			case "topLeft":case "left":case "bottomLeft":
			case "tl":case "l":case "bl": 
			case "lt":case "lb":
				return "left";
			case "top":case "center":case "bottom":case undefined:
			case "t":case "c":case "b":
				return "center";
			case "topRight":case "right":case "bottomRight":
			case "tr":case "r":case "br":
			case "rt":case "rb":
				return "right";
			default:
				return "left";
		}
	}
	
	//文字列位置の垂直位置を取得する
	function toVPos(pos){
		switch(pos){
			case "topLeft":case "top":case "topRight":
			case "tl":case "t":case "tr":
			case "lt":case "rt":
				return "top";
			case "left":case "center":case "right":case undefined:
			case "l":case "c":case "r":
				return "middle";
			case "bottomLeft":case "bottom":case "bottomRight":
			case "bl":case "b":case "br":
			case "lb":case "rb":
				return "bottom";
			default:
				return "top";
		}
	}

	//ページに含まれるグラフ全体を描画する
	//onloadイベントで実行されるメイン処理.
	//NOTE:実行するのはsvg要素に対して一度のみ
	function main(){
		var svgs = document.querySelectorAll("svg[script]:not([graph])");
		for(var i = 0, len = svgs.length; i<len; i++){
			var svg = svgs[i];
			setup(svg);
		}
	}
	
	//グラフ処理に関わる機能を追加・実行する
	function setup(svg){
		//事前処理
		setupStyle(svg);
		//コア機能の設定
		extendAPI(svg);
		drawGraph(svg);
		//オプション機能の設定
		extendAnimAPI(svg);
		extendOutputAPI(svg);
		//GUI機能の設定
		addMouseEvent(svg);
		addDragEvent(svg);
		createGUI(svg);
	}

	//スタイル設定を行う
	var rgexCRLF = new RegExp("\r\n|\n", "g");
	function setupStyle(svg){
		svg.style.overflow = "hidden";
		//改行コードの調整
		var script = svg.getAttribute("script");
		script = script.replace(rgexCRLF, "\r");
		svg.setAttribute("script", script);
		//グラフ挿入対象の属性を設定
		var vp = svg.viewportElement ? svg.viewportElement: svg;
		vp.setAttribute("graph", "graph");
	}

	//svgオブジェクトのAPIの拡張を行う
	function extendAPI(svg){
		//内部値
		var initialParams = [10];
		var currentParams = [10];
		var originalParams = [10];
		//値を設定・取得する
		svg.param = function(i, value){
			if(i>=10){return;}
			if(value === undefined){
				return currentParams[i];
			}else{
				//変換して内部に格納
				if(value instanceof String){
					value = value !== null ? value.split(";")[0]: null;
				}
				currentParams[i] = SVGGraphNonStrict.toValue(value, Math, mathjs, svg);
			}
		};
		
		//値を設定・取得する(sliderにて)
		svg.slider = function(i, value){
			if(i>=10){return;}
			if(value === undefined){
				return originalParams[i];
			}else{
				//変換して内部に格納
				if(value instanceof String){
					value = value !== null ? value.split(";")[0]: null;
				}
				originalParams[i] = SVGGraphNonStrict.toValue(value, Math, mathjs, svg);
				}
				//svg.update();
		};

		
		
		//初期値を保存
		for(var i = 0; i<10; i++){
			svg.param(i, svg.getAttribute("param" + i));
			initialParams[i] = currentParams[i];
		}
		
		//パラメータの一括変換関数
		svg.params = function(){
			for(var i = 0, len = arguments.length; i<len && i<10 ; i++){
				svg.param(i, arguments[i]);
			}
		};
		
		var initialScript = svg.getAttribute("script");
		var currentScript = initialScript;
		//スクリプトの設定関数
		svg.script = function(src){
			if(src === undefined){
				return currentScript;
			}
			currentScript = src;
		};

		//内容をリセットする
		svg.reset = function(){
			currentScript = initialScript;
			for(var i =0; i<10; i++){
				currentParams[i] = initialParams[i];
			}
			svg.update();
		};
	}
	//出力用APIを拡張する
	function extendOutputAPI(svg){
		//属性値を削除する
		function removeAttributes(elem){
			removeAttribute(elem, "script");
			removeAttribute(elem, "mode");
			removeAttribute(elem, "graphX");
			removeAttribute(elem, "graphY");
			removeAttribute(elem, "anim");
			removeAttribute(elem, "dur");
			removeAttribute(elem, "freeze");
			for(var i = 0; i<10; i++){
				removeAttribute(elem, "param" + i);
				removeAttribute(elem, "label" + i);
			}
		}
		function removeAttribute(elem, name){
			elem.setAttribute(name, "");
			elem.removeAttribute(name);
		}
		function getStyleElem(){
			var htmlStyle = document.querySelector("style.SVGGraph");
			var style = getElem("style");
			if(htmlStyle){
				style.textContent = htmlStyle.textContent;
			}
			return style;
		}
		function getDefinitionElem(){
			var svg = document.querySelector("svg.SVGGraph");
			var df = document.createDocumentFragment();
			if(svg){
				var clone = svg.cloneNode(true);
				clone.setAttribute("style", "");
				clone.style.visibility = "hidden";
				df.appendChild(clone);
			}
			return df;
		}
		//ソースコードの取得関数
		svg.getSource = function(type, needScript){
			var vp = svg.viewportElement ? svg.viewportElement: svg;
			var cloned = vp.cloneNode(true);
			removeAttributes(cloned);
			if(!needScript){
				var elems = cloned.querySelectorAll("svg");
				for(var i = 0, len = elems.length; i<len; i++){
					var elem = elems[i];
					removeAttributes(elem);
				}
			}
			//スタイルの挿入
			cloned.insertBefore(getStyleElem(), cloned.firstChild);
			//定義svg要素の挿入
			cloned.insertBefore(getDefinitionElem(), cloned.firstChild);
			//サイズ未設定の時は現在のサイズを使って設定する．
			var style = window.getComputedStyle(vp);
			if(vp.getAttribute("width")===null){
				cloned.setAttribute("width", style.width);
			}
			if(vp.getAttribute("height")===null){
				cloned.setAttribute("height", style.height);
			}
			//シリアライズする
			var serializer = new XMLSerializer();
			var source = serializer.serializeToString(cloned);
			//名前空間の追加(存在していたら無視)
			source = source.replace(/^<svg(?!.+xmlns.+>)/, '<svg xmlns="http://www.w3.org/2000/svg"');
			//xml宣言を追加
			source = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + source;
			
			switch(type){
				case "string":
					return source;
				case "encoded":
					return encodeURIComponent(source);
				case "dataScheme":
					return "data:image/svg+xml," + encodeURIComponent(source);						
				case "blob":
					return new Blob([source], {type: "image/svg+xml"});
				case "url":
				default:
					//NOTE:要らなくなったらURL.revokeObjectURLを使って削除しましょう
					try{
						var blob = new Blob([source], {type: "image/svg+xml"});
						return URL.createObjectURL(blob);
					}catch(e){
						return "data:image/svg+xml," + encodeURIComponent(source);
					}
			}
		};
	}
	//アニメーション用APIを拡張する
	function extendAnimAPI(svg){
		var requestAnimationFrame
			= window.requestAnimationFrame 
			|| window.mozRequestAnimationFrame
			|| window.webkitRequestAnimationFrame
			|| window.msRequestAnimationFrame
			|| function(func){setTimeout(func,100);};//代替関数
		//アニメーションを実行する
		svg.anim = function(params, dur, freeze){
			if(dur === undefined || dur<=0){dur=5;}
			//アニメーション中
			if(svg.animating){return;}
			//パラメータを変換
			translate(params);
			//アニメーション開始時刻
			var start = (new Date()).getTime();
			svg.animating = true;
			frame();
			function frame(){
				try{
					var current = (new Date()).getTime();
					var msec = current - start;
					var rate = msec/(1000*dur);
					if(rate<1){
						rate = window.Math.min(rate, 1);//動作タイミングによっては超えてしまう．
						rate = window.Math.max(rate, 0);
						set(rate);
						requestAnimationFrame(frame);
					}else{
						//アニメーション終了
						svg.animating = undefined;
						if(freeze){set(1);}else{set(0);}
					}
				}catch(e){
					svg.animating = undefined;
					throw e;
				}
			}
			//進行状況に応じた描画を行う
			function set(rate){
				for(var i = 0, len=params.length; i<len; i++){
					var param = params[i];
					if(param instanceof Array){
						var s = param[0];
						var e = param[1];
						svg.param(i, s + (e - s) * rate);
					}else{
						//単一値のケースはそのまま
						svg.param(i, param);
					}
				}
				//アニメーション時はソースの再評価の必要なし
				svg.update(true);
			}
		};
		function translate(params){
			for(var i=0, len=params.length; i<len; i++){
				var param = params[i];
				if(!(param instanceof Array)){
					;
					//そのまま
				}else if(param.length == 1){
					params[i] = param[0];
				}else{
					param[0] = SVGGraphNonStrict.toValue(param[0], Math, mathjs, svg);
					param[1] = SVGGraphNonStrict.toValue(param[1], Math, mathjs, svg);
				}
			}
		}
	}
	//グラフ操作GUIを構築する
	function createGUI(svg){
		placeGUI(svg);
		setVisibility(svg);
		registerBtnEvents(svg);
	}

	//GUI部品を配置する
	function placeGUI(svg){
		var elems = {};
		elems.inputs = [];
		elems.spans = [];
		//UI部品のコンテナ
		var div = getXHTMLElem("div", {"class": "gui"});
		elems.div = div;
		//テキストエリアを生成
		var ta = getXHTMLElem("textarea", {wrap: "off"});
		elems.textarea = ta;
		ta.textContent = svg.script();
		div.appendChild(ta);
		//入力フィールドを生成
		for(var i=0; i<10; i++){
			var span = getXHTMLElem("span");
			var labelText = svg.getAttribute("label" + i);
			if(!labelText){
				labelText = "p"+i+":{{p}}";
			}else if(!labelText.match(/\{\{p\}\}/)){
				labelText += ":{{p}}";
			}
			var param = svg.getAttribute("param" + i);
			if(!param){param="";}
			param = param.replace(/"/g, "&quot;");
			span.innerHTML = labelText.replace(
				/\{\{p\}\}/, 
				'<input type="text" value="' + param + '"/>');
			var input = span.querySelector("input");
			elems.inputs[i] = input;
			elems.spans[i] = span;
			div.appendChild(span);
		}
		//ボタンを生成
		var bf = getXHTMLElem("span", {"class": "buttons"});
		elems.btnUpdate = getButton("更新");
		elems.btnReset = getButton("復元");
		elems.btnStart = getButton("開始");
		elems.lnkSave = getLink("保存");
		elems.btnPng = getButton("画像");
		div.appendChild(bf);
		//svg要素の背後に配置
		var vp = svg.viewportElement ? svg.viewportElement : svg;
		vp.parentNode.insertBefore(div, vp.nextSibling);
		//変数に格納
		svg.elems = elems;

		function getButton(value){
			var elem = getXHTMLElem("input", {type: "button", value: value});
			bf.appendChild(elem);
			return elem;
		}
		function getLink(value){
			var link = getXHTMLElem("a", {href: "", target: "_blank"});
			link.textContent = value;
			bf.appendChild(link);
			return link;
		}
	}
	
	//GUIの表示非表示を制御する
	function eachAction(f){
		var g = function(elem){
			if(elem instanceof Array){
				elem.forEach(g);
				return;
			}
			f(elem);
		};
		return g;
	}
	var show = eachAction(function(elem){elem.style.display="";});
	var hide = eachAction(function(elem){elem.style.display="none";});
	var readOnly = eachAction(function(elem){elem.readOnly = true;});
	var editable = eachAction(function(elem){elem.readOnly = false;});
	//w:書き込みあり,s:スクリプト表示,p:パラメータ表示,l:リンクを表示,a:アニメーション可能,i:png出力(非推奨)
	function setVisibility(svg){
		var flags = svg.getAttribute("mode");
		var elems = svg.elems;

		if(!flags){
			hide(elems.div);
			return;
		}else{
			show(elems.div);
		}

		readOnly(elems.textarea);
		readOnly(elems.inputs);
		hide(elems.btnUpdate);
		hide(elems.btnReset);
		if(flags.match(/w/)){
			editable(elems.textarea);
			editable(elems.inputs);
			show(elems.btnUpdate);
			show(elems.btnReset);
		}
		(flags.match(/s/)? show: hide)(elems.textarea);
		(flags.match(/p/)? show: hide)(elems.spans);
		(flags.match(/l/)? show: hide)(elems.lnkSave);
		(flags.match(/a/)? show: hide)(elems.btnStart);
		//アニメーションの復帰ボタン
		if(flags.match(/a/) && svg.getAttribute("freeze") == "true"){
			show(elems.btnReset);
		}
		(flags.match(/i/)? show: hide)(elems.btnPng);

		//存在しないパラメータは隠す
		for(var i=0; i<10; i++){
			if(!svg.getAttribute("param"+i)){
				hide(elems.spans[i]);
			}
		}
	}
	
	//イベント処理を追加する．
	function registerBtnEvents(svg){
		var elems = svg.elems;
		//更新ボタン
		elems.btnUpdate.addEventListener("click", function(){
			//textareaとinput要素の内容を書き戻す
			svg.script(elems.textarea.value);
			var errored = false;
			for(var i=0; i<10; i++){
				var input = elems.inputs[i];
				clearErr(input)
				try{
					svg.param(i, input.value);
				}catch(e){
					input.title = e;
					input.setAttribute("errored", "errored");
					errored = true;
				}
			}
			//エラー時は何もしない
			if(errored){return;}
			svg.update();
			
		}, false);
		//リセットボタン
		elems.btnReset.addEventListener("click", function(){
			//textareaとinput要素の内容を復元する
			elems.textarea.value = elems.textarea.textContent;
			for(var i=0; i<10; i++){
				var input = elems.inputs[i];
				clearErr(input)
				input.value = input.getAttribute("value");
			}
			svg.reset();
		}, false);
		//保存リンク
		(function(){
			var prevSource;
			elems.lnkSave.addEventListener("mousedown", function(e){
				try{
					//前回の内容を破棄する
					URL.revokeObjectURL(prevSource);
				}catch(e){}
				var source = svg.getSource("url");
				prevSource = source;
				elems.lnkSave.href = source;
			}, false);
			//ie対策
			//see http://hebikuzure.wordpress.com/2012/12/16/file-api-%E3%81%A7%E4%BD%9C%E6%88%90%E3%81%97%E3%81%9F-blob-%E3%82%92%E3%83%80%E3%82%A6%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89%E3%81%99%E3%82%8B/
			if(window.navigator.msSaveBlob){
				elems.lnkSave.addEventListener("mousedown", function(e){
					var blob = svg.getSource("blob");
					window.navigator.msSaveOrOpenBlob(blob, "graph.svg"); 
				}, false);
			}
		})();
		//開始ボタン
		(function(){
			elems.btnStart.addEventListener("click", function(){
				var params = [];
				for(var i=0; i<10; i++){
					var input = elems.inputs[i];
					clearErr(input);
					var value = input.value;
					params[i] = value.split(";");
				}
				var dur = svg.getAttribute("dur");
				if(dur === null || dur <= 0){dur = 5;}
				var freeze = !!svg.getAttribute("freeze");
				try{
					svg.anim(params, dur, freeze);
				}catch(e){alert(e);}
			}, false);
		})();
		//画像リンク
		//NOTE:古いchromeではエラーが発生
		(function(){
			elems.btnPng.addEventListener("click", function(){
				var svgsource = svg.getSource("dataScheme");
				var img = getXHTMLElem("img");
				var canvas = getXHTMLElem("canvas");
				img.onload = function(){
					canvas.width = img.width;
					canvas.height = img.height;
					var ctx = canvas.getContext("2d");
					try{
						ctx.drawImage(img, 0, 0);
						var png = canvas.toDataURL();
					}catch(e){
						alert("png形式への変換に失敗しました．");
						return;
					}
					window.open(png, "_blank");
				};
				img.src = svgsource;
			}, false);
		})();
		function clearErr(input){
			input.removeAttribute("errored");
			input.title = "";
		}
	}

	//マウスホバーイベントを挿入する
	function addMouseEvent(svg){
		setPosition(0, 0);
		var point = svg.createSVGPoint();
		var f = function(e){
			point.x = e.clientX;
			point.y = e.clientY;
			var ctm = svg.getScreenCTM();
			var inverse = ctm.inverse();
			var p = point.matrixTransform(inverse);
			setPosition(p.x, p.y);
		}
		
		var id = svg.id;
		var selector = 'div[graph="' + id + '"],span[graph="' + id + '"],text[graph="' + id + '"],tspan[graph="' + id + '"]';
		var display = document.querySelector(selector);
		svg.addEventListener("mousemove", f, false);

		//座標を設定する
		function setPosition(x, y){
			var gX = svg.graphX(x);
			var gY = svg.graphY(y);
			svg.setAttribute("graphX", gX);
			svg.setAttribute("graphY", gY);
			if(display && id !== null && id != ""){
				display.textContent = "(" + gX + "," + gY + ")";
			}
		}
		//グラフでの座標を取得する
		svg.getGraphX = function(){return svg.getAttribute("graphX");};
		svg.getGraphY = function(){return svg.getAttribute("graphY");};
	}
	
	//マウスドラッグイベントを挿入する
	function addDragEvent(svg){
		//モード判定
		var mode = svg.getAttribute("mode");
		if(!mode || !mode.match(/m/)){return;}

		svg.addEventListener("dragstart", function(e){e.preventDefault();}, false);

		svg.style.cursor = "pointer";
		var sx = 0;
		var sy = 0;
		var x = 0;
		var y = 0;
		svg.addEventListener("mousedown", function(e){
			if(e.button != 0){return;}
			sx = e.clientX;
			sy = e.clientY;
			svg.style.cursor = "move";
			svg.addEventListener("mousemove", move, false);
		}, false);

		svg.addEventListener("mouseup", dragEnd, false);

		function dragEnd(e){
			x += e.clientX - sx;
			y += e.clientY - sy;
			svg.style.cursor = "pointer";
			svg.removeEventListener("mousemove", move, false);
		}
		
		svg.addEventListener("dblclick", function(e){
			if(!confirm("元に戻します．よろしいですか?")){return;}
			svg.slide(0, 0);
			x = 0; y = 0;
			svg.update();
		}, false);

		function move(e){
			svg.slide(e.clientX - sx + x, e.clientY - sy + y);		
			svg.update();
		}
	}

	//マーカーidのグローバルカウンタ
	var markerCount = 0;
	//単一のグラフを描画するためのAPIを定義する
	function drawGraph(svg){
				
		//スタイル
		var style, mStyle, tStyle, aStyle;
		//グラフ領域設定
		var setting = new graphSetting();
		//マクロをこのスコープに展開する
		var Macro = translateMacro();
		//main内部で呼び出すファンクションのキャッシュ
		var f,pre,post;
		//evalで生成したファンクションのキャッシュ
		var funcCache = {};
		//コールバック関数
		var callback = function(){};
		var cp = {};
		
		//apiを拡張する
		function extendAPI(){
			//メイン処理を外部に公開
			svg.update = main;
			//座標変換・スケール変換関数を公開
			svg.graphX = function(svgX){return setting.graphX(svgX);}
			svg.graphY = function(svgY){return setting.graphY(svgY);}
			svg.posX = function(x){return setting.posX(x);}
			svg.posY = function(y){return setting.posY(y);}
			svg.scaleX = function(width){return setting.scaleX(width);}
			svg.scaleY = function(height){return setting.scaleY(height);}
			svg.setCallback = function(f){callback = f;}
			svg.slide = function(x, y){setting.slideX = x;setting.slideY = y;}
			svg.clear = clear;
			//外部からコマンドを実行する場合
			svg.commands = function(commandName){
				var func = eval(commandName);
				return func;
			}
			//外部からマクロを実行する場合
			svg.macros = function(macroName){
				return Macro[macroName];
			}
		}

		//メイン処理
		//repeating…解析不要の場合にtrueを渡す
		function main(repeating){
			initStyle();
			//グラフの内容を初期化する
			clear();
			//スクリプトを実行する
			var h;
			for(var i in cp){
				delete cp[i];
			}
			try{
				h = svg.suspendRedraw(1000);			
				var m = Math;
				if(!repeating){
					setting.init(svg);	
					//関数のキャッシュをクリア
					funcCache = {};
					//ソースをコンパイル
					eval("pre = " + _pre.toString());
					eval("f = function(){" + setting.script + "\n\r};");
					eval("post = " + _post.toString());
				}
				pre();
				f();
				post();
			}catch(e){
				var t = getElem("text", {x: 0, y: 20, fontSize: 20});
				t.textContent = e;
				svg.appendChild(t);
				svg.setAttribute("title", e);
			}finally{
				svg.unsuspendRedraw(h);
			}
			//コールバック関数を実行
			callback(svg, cp);
		}
		
		//スタイル設定を初期化する
		function initStyle(){
			
			//図形を描画する際にこのスタイルを参照する(書き換え/追加可能)
			style = {
				fill: "none",
				stroke: "black",
				strokeWidth: 1
			};
			//マーカースタイル
			mStyle = {
				size: 10,
				color: "inherit",
				fill: "white"
			};
			//文字列を描画する際にこのスタイルを参照する(書き換え/追加可能)
			tStyle = {
				fontStyle: "normal",
				fontSize: 13
			};
			//座標軸スタイル
			aStyle = {
				axisStroke: "black",
				axisWidth: 2,
				gridStroke: "darkGray",
				gridWidth: 1,
				indexSize: 10
			};
		}

		//マクロをこのスコープで実行可能とする．
		//NOTE:functionオブジェクトを一旦source化してからevalする
		function translateMacro(){
			var _macro = {};
			var m = Math;
			for(var i in _Macro){
				var f = _Macro[i];
				var source = f.toString();
				var g;
				var s = "g = " + source;
				eval(s);
				_macro[i] = g;
			}
			return _macro;
		}
		//グラフ範囲を設定する
		function setRange(xMin, xMax, yMin, yMax){
			xMin = fix(xMin);
			xMax = fix(xMax);
			yMin = fix(yMin);
			yMax = fix(yMax);
			setting.setRange(xMin, xMax, yMin, yMax);
			//既存の内容を廃棄する
			clear()
		}
		//グラフ範囲を矩形範囲で設定する
		function setRangeAsRect(x, y, width, height){
			x = fix(x);
			y = fix(y);
			width = fix(width);
			height = fix(height);
			setRange(x, x+width, y, y+height);
		}

		//内部で利用可能な関数群
		//関数によるグラフを描画する
		//第一引数に関数を渡す
		//(1)Functionを渡す
		//(2)変数表記(変数はx固定)の文字列
		//(3)媒介変数表記(変数はt固定)の文字列
		function plot(func, from, to, pCount, markerStart, markerEnd){
			var result = functionToPoints(func, from, to, pCount);
			return path(result, false, markerStart, markerEnd);
		}
		
		//グラフとx軸との間の領域を生成します．
		function area(func, from, to, pCount){
			var result = functionToPoints(func, from, to, pCount);
			result.unshift([result[0][0], 0]);
			result.push([result[result.length-1][0], 0]);
			var p = path(result);
			p.style.stroke = "none";
			append(p);
			return p;
		}

		//evalで生成したfunctionオブジェクトをメモリに保存する．
		//NOTE:アニメーション時に大量のfunctionが生成され，メモリを圧迫するため
		function getFunc(source, paramName){
			var id  = source + ":" + paramName;
			var func = funCache[id];
			if(!func){
				func = SVGGraphNonStrict.toFunction(source, paramName, Math, mathjs, svg);
				funcCache[id] = func;
			}
			return func;
		}
		//ソースを元にfunctionオブジェクトを求める
		function translateFunc(func){
			var f, g;
			if(func instanceof Function){
				f = function(x){return x;}
				g = func;
			}else if(typeof func == "string"){
				f = function(x){return x;}
				g = SVGGraphNonStrict.toFunction(func, "x", Math, mathjs, svg);
			}else if(func instanceof Array){
				if(func[0] instanceof Function){
					f = func[0];
				}else if(typeof func[0] == "string"){
					f = SVGGraphNonStrict.toFunction(func[0], "t", Math, mathjs, svg);
				}
				if(func[1] instanceof Function){
					g = func[1];
				}else if(typeof func[1] == "string"){
					g = SVGGraphNonStrict.toFunction(func[1], "t", Math, mathjs, svg);
				}
			}
			return {fx: f, fy: g};
		}
		
		//関数を元にパラメータリストに対応する座標のリストを求める
		function getPoints(funcs, params){
			var point;
			var points = [];
			if(!params){return [];}
			for(var i = 0, len = params.length; i<len; i++){
				point = getPoint(funcs, params[i]);
				//不正な座標の判定
				if(isValid(point[0]) && isValid(point[1])){
					points.push(point);
				}
			}
			return points;
			//値が座標として正しいかどうかを判定する
			function isValid(value){
				return !isNaN(value) && (window.Math.abs(value) != Infinity);
			}
		}
		//座標変換を行う
		function getPoint(funcs, t){
			return [funcs.fx(t), funcs.fy(t)];
		}
		
		//関数を頂点のリストに変換する
		function functionToPoints(func, from, to, pCount){
			from = fix(from, setting.minX);
			to = fix(to, setting.maxX);
			if(pCount == undefined || pCount<=0){pCount = 1000;}
			var result = {};
			//変換関数を求める
			var funcs = translateFunc(func);
			//関数を近似する
			var params = [];
			for(var i = 0; i<=pCount; i++){
				params.push(from + (to-from)/pCount*i);
			}
			return getPoints(funcs, params);
		}
		
		//2元関数の出力を行う
		//平面を変形したような結果が得られる．
		function surface(fxSource, fySource, sFrom, sTo, tFrom, tTo, freq, pCount){
			sFrom = fix(sFrom, setting.minX);
			sTo = fix(sTo, setting.maxX);
			tFrom = fix(tFrom, setting.minY);
			tTo = fix(tTo, setting.maxY);
			if(freq == undefined || freq<=0){freq = 5;}
			if(pCount == undefined || pCount<=0){pCount = 300;}

			var g = getElem("g", {"class": "surface"});
			var pfx = SVGGraphNonStrict.toFunction(fxSource, "s,t", Math, mathjs, svg);
			var pfy = SVGGraphNonStrict.toFunction(fySource, "s,t", Math, mathjs, svg);
			var fx, fy;
			var i;
			var points;
			var p;
			//sを固定してtを動かす
			var gs = getElem("g", {"class": "sfixed"});
			for(i = 0; i<=freq; i++){
				fx = getSFixed(pfx, sFrom + (sTo-sFrom)/freq*i);
				fy = getSFixed(pfy, sFrom + (sTo-sFrom)/freq*i);
				points = functionToPoints([fx, fy], tFrom, tTo, pCount);
				gs.appendChild(path(points, false));
			}
			g.appendChild(integrateStyle(gs));
			//tを固定してsを動かす
			var gt = getElem("g", {"class": "tfixed"});
			for(i = 0; i<=freq; i++){
				fx = getTFixed(pfx, tFrom + (tTo-tFrom)/freq*i);
				fy = getTFixed(pfy, tFrom + (tTo-tFrom)/freq*i);
				points = functionToPoints([fx, fy], sFrom, sTo, pCount);
				gt.appendChild(path(points, false));
			}
			g.appendChild(integrateStyle(gt));
			return append(g);
			//2変数の関数で片方の変数を固定した関数を取得する
			function getSFixed(f, sValue){
				return function(t){
					return f(sValue, t);
				};
			}
			function getTFixed(f, tValue){
				return function(s){
					return f(s, tValue);
				};
			}
		}
		
		//基本図形の描画
		//直線(線分)を引く
		function line(x1, y1, x2, y2, markerStart, markerEnd){
			x1 = fix(x1, 0);
			y1 = fix(y1, 0);
			x2 = fix(x2, 0);
			y2 = fix(y2, 0);
			var l = getStyledElem("line");
			l.x1.baseVal.value = setting.posX(x1);
			l.y1.baseVal.value = setting.posY(y1);
			l.x2.baseVal.value = setting.posX(x2);
			l.y2.baseVal.value = setting.posY(y2);
			return treatMarker(append(l), markerStart, markerEnd);
		}
		
		//無限直線を引く
		function iline(x1, y1, x2, y2){
			return _line(true, x1, y1, x2, y2);
		}
		
		//半直線を引く
		function hline(x1, y1, x2, y2, markerStart){
			return _line(false, x1, y1, x2, y2, markerStart);
		}
		
		//直線を引く(共通関数)
		function _line(isFull, x1, y1, x2, y2, markerStart){
			x1 = fix(x1, 0);
			y1 = fix(y1, 0);
			x2 = fix(x2, 0);
			y2 = fix(y2, 0);
			if(x1==x2 && y1==y2){return line(x1, y1, x2, y2);}
			//垂直のケース
			if(x1==x2){
				var sy, ey;
				if(y1<y2){
					sy = setting.minY;
					ey = setting.maxY;
				}else{
					sy = setting.maxY;
					ey = setting.minY;
				}
				if(isFull){
					return line(x1, sy, x1, ey);
				}else{
					return line(x1, y1, x1, ey, markerStart);
				}
			}
			//傾き
			var slope = (y2-y1)/(x2-x1);
			//切片
			var slice = (y1+y2-(x1+x2)*slope)/2;
			var sx, ex;
			if(x1<x2){
				sx = setting.minX;
				ex = setting.maxX;
			}else{
				sx = setting.maxX;
				ex = setting.minX;
			}
			if(isFull){
				return line(sx, slope*sx + slice, ex, slope*ex + slice);
			}else{
				return line(x1, y1, ex, slope*ex + slice, markerStart);
			}
		}
		
		//斜線を引く(線分)
		function slope(x, y, rad, length, markerStart, markerEnd){
			return _slope(line, x, y, rad, length, markerStart, markerEnd);
		}
		
		//斜線を引く(無限直線)
		function islope(x, y, rad){
			return _slope(iline, x, y, rad, 1);
		}
		
		//斜線を引く(半直線)
		function hslope(x, y, rad, markerStart){
			return _slope(hline, x, y, rad, 1, markerStart);
		}
		
		//斜線を引く(共通関数)
		function _slope(func, x, y, rad, length, markerStart, markerEnd){
			x = fix(x, 0);
			y = fix(y, 0);
			rad = fix(rad, 0);
			length = fix(length, 1);
			return func(x, y, x + length*Math.cos(rad), y + length*Math.sin(rad), markerStart, markerEnd);
		}
		
		//パス・折れ線を描画する
		function path(points, isClosed, markerStart, markerEnd){
			if(typeof points == "string"){
				points = str(points);
			}
			//頂点が少なければラインを引けない
			if(points.length<2){
				return;
			}
			var p = getStyledElem("path");
			var values = [];
			for(var i = 0, len = points.length; i<len; i++){
				var point = points[i];
				values.push(setting.posX(fix(point[0],0)));
				values.push(setting.posY(fix(point[1],0)));
			}
			p.setAttribute("d", "M" + values.join(",") + (isClosed ? "z" : ""));
			return treatMarker(append(p), markerStart, markerEnd);
		}
		
		//タートルグラフィックを描画する
		//NOTE:始点を指定したあと，向きの増減と距離のリストを渡すことでパスを表現する
		function turtle(x, y, commands, isClosed, markerStart, markerEnd){
			x = fix(x, 0);
			y = fix(y, 0);
			var cRad = 0;
			var points = [];
			points.push([x,y]);
			for(var i = 0, len = commands.length; i<len; i++){
				var command = commands[i];
				var rad = fix(command[0], 0);
				var length = fix(command[1], 0);
				var times = fix(command[2], 1);
				var div = fix(command[3], 0);
				for(var j = 0; j<times; j++){
					cRad += rad;
					x += Math.cos(cRad) * length;
					y += Math.sin(cRad) * length;
					points.push([x,y]);
					length += div;
				}
			}
			return path(points, isClosed, markerStart, markerEnd);
		}

		//円を描画する
		function circle(cx, cy, r){
			cx = fix(cx, 0);
			cy = fix(cy, 0);
			r = fix(r, 1);
			var c = getStyledElem("circle");
			c.cx.baseVal.value = setting.posX(cx);
			c.cy.baseVal.value = setting.posY(cy);
			c.r.baseVal.value = setting.scaleX(r);
			return append(c);
		}

		//楕円を描画する
		function ellipse(cx, cy, rx, ry){
			cx = fix(cx, 0);
			cy = fix(cy, 0);
			rx = fix(rx, 1);
			ry = fix(ry, 1);
			var e = getStyledElem("ellipse");
			e.cx.baseVal.value = setting.posX(cx);
			e.cy.baseVal.value = setting.posY(cy);
			e.rx.baseVal.value = setting.scaleX(rx);
			e.ry.baseVal.value = setting.scaleY(ry);
			return append(e);
		}

		//円弧扇型共通関数
		function getArcFunc(cx, cy, rx, ry){
			cx = fix(cx, 0);
			cy = fix(cy, 0);
			rx = fix(rx, 1);
			ry = fix(ry, 1);
			return ["cos(t)*" + rx + "+" + cx, "sin(t)*" + ry + "+" + cy];
		}
		//円弧を描画する
		function arc(cx, cy, rx, ry, from, to, markerStart, markerEnd){
			from = fix(from, 0);
			to = fix(to, window.Math.PI * 2);
			var func = getArcFunc(cx, cy, rx, ry);
			var pCount = Math.floor(Math.abs(from - to)/Math.PI*180);
			return treatMarker(plot(func, from, to, pCount), markerStart, markerEnd);
		}
		//扇型を描画する
		function pie(cx, cy, rx, ry, from, to){
			from = fix(from, 0);
			to = fix(to, window.Math.PI * 2);
			var func = getArcFunc(cx, cy, rx, ry);
			var pCount = Math.floor(Math.abs(from - to)/Math.PI*180);
			var points = functionToPoints(func, from, to, pCount);
			points.unshift([cx, cy]);
			return path(points, true);
		}
		
		//矩形を描画する
		function rect(x, y, width, height, rx, ry){
			x = fix(x, 0);
			y = fix(y, 0);
			width = fix(width, 1);
			height = fix(height, 1);
			rx = fix(rx, 0);
			ry = fix(ry, 0);
			var r = getStyledElem("rect");
			//負の値を指定可能とする
			if(width>=0){
				r.x.baseVal.value = setting.posX(x);
				r.width.baseVal.value = setting.scaleX(width);
			}else{
				r.x.baseVal.value = setting.posX(x+width);
				r.width.baseVal.value = setting.scaleX(-width);
			}
			if(height>=0){
				r.y.baseVal.value = setting.posY(y)-setting.scaleY(height);
				r.height.baseVal.value = setting.scaleY(height);
			}else{
				r.y.baseVal.value = setting.posY(y);
				r.height.baseVal.value = setting.scaleY(-height);
			}
			r.rx.baseVal.value = setting.scaleX(rx);
			r.ry.baseVal.value = setting.scaleY(ry);
			return append(r);
		}
		
		//水平線を描画する
		function horizon(y){
			return line(setting.minX, y, setting.maxX, y);
		}
		//垂直線を描画する
		function vertical(x){
			return line(x, setting.minY, x, setting.maxY);
		}
		
		//文字列を描画する
		function textSingleLine(x, y, str, pos, fontSize){
			x = fix(x, 0);
			y = fix(y, 0);
			var tA;
			var fSize = (fontSize === undefined) ? tStyle.fontSize: fontSize;
			var dy;	
			//テキスト配置
			switch(toHPos(pos)){
				case "left":
					tA = "start";
					break;
				case "center":
					tA = "middle";
					break;
				case "right":
					tA = "end";
					break;
			}
			switch(toVPos(pos)){
				case "top":
					dy = fSize;
					break;
				case "middle":
					dy = fSize/2;
					break;
				case "bottom":
					dy = 0;
					break;
			}
			//NOTE:経験上2px程度上にずらすとしっくりくる(baselineの問題)
			var t = getElem("text", {x: setting.posX(x), y: setting.posY(y)+dy-2});
			applyStyle(t, tStyle);
			//textについてはpxをつけないと正しく動作しない．
			t.style.fontSize = fSize + "px";
			var style = t.style;
			style.textAnchor = tA;
			t.textContent = str;
			return append(t);
		}
		
		//複数行テキストの描画
		//\nで改行します．
		function text(x, y, str, pos){
			str = fixStr(str, "");
			var ln = str.split("\n");
			var len = ln.length;
			if(len==1){
				return textSingleLine(x, y, str, pos);
			}
			var g = getElem("g");		
			var dPosStart;
			var fSize = tStyle.fontSize;
			if(isNaN(fSize)){fSize = 16;}
			switch(toVPos(pos)){
				case "top":
					dPosStart = 0;
					break;
				case "middle":
					dPosStart = -fSize/2*(len-1);
					break;
				case "bottom":
					dPosStart = -fSize*(len-1);
					break;
			}
			for(var i=0; i<len; i++){
				var t = textSingleLine(x, y, ln[i], pos, fSize);
				t.setAttribute("transform", "translate(0, " + (dPosStart + fSize * i) + ")");
				g.appendChild(t);
			}
			g.className.baseVal = "text";
			return append(g);
		}

		//マーカー定義のための関数群
		//マーカーを取り扱う
		function treatMarker(elem, markerStart, markerEnd){
			if(markerStart!==undefined && markerStart != "none"){
				appendMarker(elem, markerStart, false);				
			}
			if(markerEnd!==undefined && markerEnd != "none"){
				appendMarker(elem, markerEnd, true);				
			}
			return elem;
		}
		//マーカーを挿入する
		function appendMarker(elem, markerStyle, isEnd){
			var params = {
				id: "marker_auto_created_" + (markerCount++),
				markerUnits: "userSpaceOnUse",
				markerWidth: mStyle.size,
				markerHeight: mStyle.size,
				viewBox: "0 0 10 10",
				overflow: "visible",
				refX: "5",
				refY: "5",
				orient: "auto"
			};
			var marker = getElem("marker", params);	
			marker.appendChild(getMarkerShape(markerStyle));
			append(marker);
			elem.style[isEnd ? "markerEnd": "markerStart"] = "url(#" + marker.id + ")";
			return elem;
		}
		//マーカー用の図形を生成する
		function getMarkerShape(markerStyle){
			var shapeTemplate = Marker[markerStyle];
			if(shapeTemplate === undefined){shapeTemplate = getElem("rect");}
			var shape = shapeTemplate.cloneNode(false);
			
			if(shapeTemplate.isBlackCase){
				shape.style.fill = getMarkerColor();
				shape.style.stroke = "none";
			}else{
				shape.style.fill = mStyle.fill;
				shape.style.stroke = getMarkerColor();
			}
			//マーカーに点線は無用
			shape.style.strokeDasharray = "";
			shape.className.value = "marker";
			return shape;
			function getMarkerColor(){
				return mStyle.color == "inherit" ? style.stroke: mStyle.color;
			}
		}

		//座標指示を行う
		//formatにはラベル文字列を指定します{{x}},{{y}}の部分は座標に置き換えられます．
		function dot(x, y, markerStyle, format){
			var sx = x;
			var sy = y;
			x = fix(x, 0);
			y = fix(y, 0);
			markerStyle = fixStr(markerStyle, "dot");
			format = fixStr(format, "");
			var posX = setting.posX(x);
			var posY = setting.posY(y);
			var marker = getMarkerShape(markerStyle);
			var scale = mStyle.size / 10;
			marker.setAttribute(
				"transform", 
				"translate(" + posX + "," + posY + "),scale(" + scale + "," + scale + "),translate(-5,-5)");
			append(marker);
			//付属テキスト
			var str = format
				.replace(/\{\{x\}\}/g, x)
				.replace(/\{\{y\}\}/g, y)
				.replace(/\{\{sx\}\}/g, sx)
				.replace(/\{\{sy\}\}/g, sy);
			var slide = mStyle.size / 2;
			var text = textSingleLine(x, y, str, "top");
			text.setAttribute("transform", "translate(0," + slide + ")");
			var g = getElem("g");
			g.appendChild(marker);
			g.appendChild(text);
			g.className.baseVal = "dot";
			return append(g);
		}
		
		//座標指示の一括出力を行う
		function dots(ds, markerStyle, format){
			if(typeof ds == "string"){
				ds = str(ds);
			}
			var g = getElem("g");
			for(var i=0, len=ds.length; i<len; i++){
				var d = ds[i];
				g.appendChild(dot(d[0], d[1], markerStyle, format));
			}
			g.className.baseVal = "dots";
			append(g);
		}
		
		//原点からの距離グリッドを表示する
		function distance(gridStyle, d, max, skip){
			//既に存在したら何もしない．
			if(svg.querySelector("g.axisSet")){return;}
			gridStyle = fixStr(gridStyle, "full");			
			d = fix(d, 1);
			max = fix(max, 10);
			skip = fix(skip, 0);
			var fsize = aStyle.indexSize;
			var i,elem,style;			
			var g = getElem("g", {"class": "axisSet"});

			var gGrid = getElem("g", {"class": "grid"});
			var gAxis = getElem("g", {"class": "axis"});
			var gIndex = getElem("g", {"class": "index"});

			//格子と目盛
			for(var i=1; i*d<=max; i++){
				elem = ellipse(0,0,i*d,i*d);
				style = elem.style;
				switch(gridStyle){
					case "dashed":
						style.strokeDasharray = "5";
					case "full":
					default:
						style.stroke = aStyle.gridStroke;
						style.strokeWidth = aStyle.gridWidth;
						break;
				}
				gGrid.appendChild(elem);
				if(i%(skip+1)==0){
					elem = textSingleLine(i*d, 0, i*d+"", "top", fsize)
					elem.style.fontSize = fsize;
					gIndex.appendChild(elem);
				}
			}
			integrateStyle(gGrid);
			gIndex.setAttribute("transform", "translate(0,2)");
			integrateStyle(gIndex);

			//軸
			g.appendChild(gAxis);
			elem = line(0,0,setting.maxX,0);
			style = elem.style;
			style.shapeRendering = "crispEdges";
			style.stroke = aStyle.axisStroke;
			style.strokeWidth = aStyle.axisWidth;

			//階層構造をまとめる
			g.appendChild(gGrid);
			g.appendChild(gAxis);
			g.appendChild(gIndex);
			return append(g);
		}

		//グラフ描画のための補助関数
		//座標軸を描画する
		function axis(gridStyle, dx, dy, skipX, skipY){
			//既に存在したら何もしない．
			if(svg.querySelector("g.axisSet")){return;}
			
			dx = fix(dx, 0);
			dy = fix(dy, 0);
			gridStyle = fixStr(gridStyle, "none");
			skipX = fix(skipX, -1);
			skipY = fix(skipY, -1);
			//格子の描画基準座標
			var minX, maxX, minY, maxY, setGridStyle;
			switch(gridStyle){
				case "short":
					var len = 4/setting.scaleX(1);
					minX = -len;
					maxX = len;
					minY = -len;
					maxY = len;
					setGridStyle = function(elem){return elem;};
					break;
				case "full":
					minX = setting.minX;
					maxX = setting.maxX;
					minY = setting.minY;
					maxY = setting.maxY;
					setGridStyle = function(elem){return elem;};
					break;
				case "dashed":
					minX = setting.minX;
					maxX = setting.maxX;
					minY = setting.minY;
					maxY = setting.maxY;
					setGridStyle = function(elem){
						elem.style.strokeDasharray = "5,5";
						return elem;
					};
					break;
				default:
					setGridStyle = function(){};
			}
			//格子の描画
			var gGrid = getElem("g", {"class": "grid"});
			var l;
			if(gridStyle != "none"){
				var i;
				if(dx>0){
					for(i = setting.minX - setting.minX%dx; i<=setting.maxX; i+=dx){
						gGrid.appendChild(line(i,minY,i,maxY));
					}
				}
				if(dy>0){
					for(i = setting.minY - setting.minY%dy; i<=setting.maxY; i+=dy){
						gGrid.appendChild(line(minX,i,maxX,i));
					}
				}
			}
			integrateStyle(gGrid);
			setGridStyle(setStyle(gGrid));

			//座標軸の描画
			var gAxis = getElem("g", {"class": "axis"});
			gAxis.appendChild(line(setting.minX, 0, setting.maxX, 0));
			gAxis.appendChild(line(0, setting.minY, 0, setting.maxY));
			integrateStyle(gAxis);
			setStyle(gAxis, true);

			//目盛の追加
			var ind = index(dx, dy, skipX, skipY);
			
			//要素をまとめる
			var g = getElem("g", {"class": "axisSet"});
			g.appendChild(gGrid);
			g.appendChild(gAxis);
			g.appendChild(ind);
			return append(g);

			function setStyle(elem, isAxis){
				var s = elem.style;
				s.shapeRendering = "crispEdges";
				if(isAxis){
					s.stroke = aStyle.axisStroke;
					s.strokeWidth = aStyle.axisWidth;
				}else{
					s.stroke = aStyle.gridStroke;
					s.strokeWidth = aStyle.gridWidth;
				}
				return elem;
			}
		}
		
		//目盛を描画する
		function index(dx, dy, skipX, skipY){
			var i, x, y, len;
			var fsize = aStyle.indexSize;
			var g = getElem("g", {"class": "index"});
			var gx = getElem("g", {"class": "x"});
			var gy = getElem("g", {"class": "y"});
			if(skipX>=0){
				for(i = -1; true; i--){
					x = i * dx * (skipX + 1);
					if(setting.maxX < x){ continue;}
					if(x < setting.minX){ break;}
					gx.appendChild(textSingleLine(x, 0, x+"", "top", fsize));
				}
				for(i = 1; true; i++){
					x = i * dx * (skipX + 1);
					if(x < setting.minX){ continue;}
					if(setting.maxX < x){ break;}
					gx.appendChild(textSingleLine(x, 0, x+"", "top", fsize));
				}
			}
			gx.setAttribute("transform", "translate(0,3)");
			if(skipY>=0){
				for(i = -1; true; i--){
					y = i * dy * (skipY + 1);
					if(setting.maxY < y){ continue;}
					if(y < setting.minY){ break;}
					gy.appendChild(textSingleLine(0, y, y+"", "right", fsize));
				}
				for(i = 1; true; i++){
					y = i * dy * (skipY + 1);
					if(y < setting.minY){ continue;}
					if(setting.maxY < y){ break;}
					gy.appendChild(textSingleLine(0, y, y+"", "right", fsize));
				}
			}
			gy.setAttribute("transform", "translate(-3, 0)");
			g.appendChild(integrateStyle(gx));
			g.appendChild(integrateStyle(gy));
			return append(g);
		}

		//タイトルを挿入する
		function title(str){
			var t = getElem("title");
			t.textContent = str;
			return append(t);
		}

		//注釈を挿入する
		function desc(str){
			var d = getElem("desc");
			d.textContent = str;
			return append(d);
		}
		
		//svgのパス文字列を直接挿入する
		var shape = (function(){
			function translate(seg, map){
				for(var i in map){
					if(seg[i]!==undefined){seg[i] = map[i](seg[i]);}
				}
			}
			function posX(x){return setting.posX(x);}
			function posY(y){return setting.posY(y);}
			function scaleX(x){return setting.scaleX(x);}
			function scaleY(y){return setting.scaleY(y);}
			function flipY(y){return -setting.scaleY(y);}
			function swf(sw){return sw==0?1:0;}
			function angle(a){return -a;}
			var abs = {
				x: posX, y: posY, x1: posX, y1: posY, x2: posX, y2: posY,
				rx: scaleX, ry: scaleY, sweepFlag: swf, angle: angle
			};
			var rel = {
				x: scaleX, y: flipY, x1: scaleX, y1: flipY, x2: scaleX, y2: flipY,
				rx: scaleX, ry: scaleY, sweepFlag: swf, angle: angle
			}
			return function(d){
				var p = getStyledElem("path");
				p.setAttribute("d", d);
				//座標を修正
				var segs = p.pathSegList;
				for(var i=0, len=segs.numberOfItems; i<len; i++){
					var seg = segs.getItem(i);
					translate(seg, seg.pathSegType%2==0? abs: rel);
				}
				append(p);
			}
		})();
		
		//ノードを挿入する
		function append(node){
			svg.appendChild(node);
			return node;
		}
		//ノードを座標軸の背面に挿入する
		function bg(node){
			var axis = svg.querySelector("g.axisSet");
			svg.insertBefore(node, axis);
			return node;
		}
		//内容をクリアする
		function clear(){
			clearSvg(svg);
		}

		//スタイル設定を行った要素を取得する
		function getStyledElem(name){
			var elem = getElem(name);
			return applyStyle(elem, style);
		}
		
		//文字列を数値もしくはその配列に変換する
		function val(expression, arrayOnly){
			//元の式を配列のソース形式に変換
			var source = expression
				.replace(/,/g, '","')
				.replace(/\[/g, '["')
				.replace(/\]/g, '"]')
				.replace(/"\[/g, "[")
				.replace(/\]"/g, "]");
			var values;
			eval("values = " + source + ";");
			if(arrayOnly){
				return values;
			}
			return valArray(values);
		}
		//文字列を文字列もしくはその配列に変換する
		function str(expression){
			return val(expression, true);
		}
		//配列の内容を再帰的に評価する
		function valArray(values){
			if(values instanceof Array){
				for(var i=0, len=values.length; i<len; i++){
					var a = values[i];
					values[i] = valArray(a);
				}
				return values;
			}else{
				return toValue(values);
			}
		}

		//式を数値に変換する
		function toValue(expression){
			return SVGGraphNonStrict.toValue(expression, Math, mathjs, svg);
		}

		//未定義値に対する規定値を返す
		function fix(val, defaultVal){
			var result = toValue(val);
			return result === undefined || result == null ? defaultVal : result;
		}
		//未定義値に対する規定値を返す（文字列のケース）
		function fixStr(val, defaultVal){
			return (val === undefined 
				|| val == null 
				|| (val instanceof String && val == "")) ? defaultVal : val+"";
		}

		//apiを公開する
		extendAPI()
		//メイン処理の実行
		main();
	}

	//要素にスタイルを適用する
	function applyStyle(elem, style){
		var s = elem.style;
		for(var i in style){
			var value = style[i];
			if(value !== undefined && value != ""){
				s[i] = value;
			}
		}
		return elem;
	}

	//要素のスタイルを集約する
	function integrateStyle(g){
		for(var i = 0, len = g.childNodes.length; i<len; i++){
			var c = g.childNodes[i];
			if(i==0){
				var style = c.getAttribute("style");
				if(style){
					g.setAttribute("style", style);
				}else{
					//for presto Opera
					style = c.getAttributeNS(SVG_NS, "style");
					g.setAttributeNS(SVG_NS, "style", style);
				}
			}
			c.setAttribute("style", "");
			c.removeAttribute("style");
		}
		return g;
	}

	//グラフの内容をクリアする
	//スクリプトにより自動生成されたもののみを削除する
	function clearSvg(svg){
		svg.removeAttribute("title");
		var nodes = svg.querySelectorAll("svg *[auto-created=true]");
		for(var i = 0, len = nodes.length; i<len; i++){
			var node = nodes[i];
			node.parentNode.removeChild(nodes[i]);
			//そのまま破棄せず再利用する
			cacheElem(node.tagName, node);
		}
	}
	
	//グラフ設定の取得
	function graphSetting(svg){}
	(function(proto){
		proto.init = function(svg){
			if(!svg.viewportElement){
				caseViewport(svg, this);
			}else{
				caseNested(svg, this);
			}
			//生のコードを実行可能なコードとする．
			this.script = svg.script().replace(/\{\{(\d)\}\}/g, "(svg.param($1))");
		};
		//svg要素の場合
		function caseViewport(svg, me){
			var size = getViewportSize(svg);
			setSize(svg, size, me);
		}
		//入れ子のsvg要素の場合
		function caseNested(svg, me){
			var width = getAttr(svg, "width", 0);
			var height = getAttr(svg, "height", 0);
			var vpSize = getViewportSize(svg);
			var size = {
				width: width==0 ? vpSize.width: width,
				height: height==0 ? vpSize.height: height
			};
			setSize(svg, size, me);
		}
		//ビューポートsvg要素の大きさを取得する
		function getViewportSize(svg){
			var vp = svg.viewportElement ? svg.viewportElement: svg;
			var style = window.getComputedStyle(vp);
			var width = style.width.replace(/px/, "")*1;
			var height = style.height.replace(/px/, "")*1;
			if(width == 0 || height == 0){
				width = getAttr(vp, "width", 200);
				height = getAttr(vp, "height", 200);
			}
			return {width: width, height: height, viewBox: svg.getAttribute("viewBox")};
		}
		//基本となる描画サイズを適用する
		function setSize(svg, size, me){
			me.width = size.width;
			me.height = size.height;
			me.setRange(-me.width/2, me.width/2, -me.height/2, me.height/2);
			if(svg.getAttribute("viewBox") == null){
				svg.setAttribute("viewBox", [0, 0, me.width, me.height].join(" "));
			}
		}
		//グラフのスライド値
		proto.slideX = 0;
		proto.slideY = 0;

		proto.setRange = function(minX, maxX, minY, maxY){
			Object.defineProperty(this, "minX", {get: function(){return minX-this.slideX/this.unitX;}, configurable : true});
			Object.defineProperty(this, "maxX", {get: function(){return maxX-this.slideX/this.unitX;}, configurable : true});
			Object.defineProperty(this, "minY", {get: function(){return minY+this.slideY/this.unitY;}, configurable : true});
			Object.defineProperty(this, "maxY", {get: function(){return maxY+this.slideY/this.unitY;}, configurable : true});
			this.unitX = this.width/window.Math.abs(maxX - minX);
			this.unitY = this.height/window.Math.abs(maxY - minY);
			check(this);
		};

		//パラメータ設定の確認を行う
		function check(me){
			if(me.minX >= me.maxX){throw "parameter error:maxX must be grater than minX."}
			if(me.minY >= me.maxY){throw "parameter error:maxY must be grater than minY."}
		}
		
		//属性を取得する．
		function getAttr(svg, name, defaultValue){
			var value = svg.getAttribute(name);
			return value != null ? value.split("px")[0] * 1 : defaultValue;
		}

		//グラフ座標をsvg座標に変換する
		proto.posX = function(x){
			return round((x - this.minX) * this.unitX);
		};
		proto.posY = function(y){
			return round(this.height - (y - this.minY) * this.unitY);
		}
		//svg座標をグラフ座標に変換する
		proto.graphX = function(x){
			return round(x / this.unitX + this.minX);
		};
		proto.graphY = function(y){
			return round((this.height - y)/this.unitY + this.minY);
		}
		//グラフサイズをsvgサイズに変換する
		proto.scaleX = function(x){
			return round(x * this.unitX);
		};
		proto.scaleY = function(y){
			return round(y * this.unitY);
		};
		function round(value){
			//グラフ描画には小数点以下2桁程度で十分
			return window.Math.round(value*100)/100;
		}
	})(graphSetting.prototype);

	//イベント処理登録
	(function(){
		document.addEventListener("DOMContentLoaded", main, true);
	})();
	
	//変換関数
	var mathjs = function(str){return str;}

	//変換関数は後から変更できる．
	function registerConverter(f){mathjs = f;}

	//外部に公開するインターフェース
	return (function(){
		var obj = {};
		obj.registerMath = registerMath;
		obj.registerMacro = registerMacro;
		obj.registerMarker = registerMarker;
		obj.registerConverter = registerConverter;
		obj.registerPresetting = registerPresetting;
		obj.registerPostsetting = registerPostsetting;
		Object.defineProperty(obj, "mathjs", {
			get: function(){return mathjs;}
		});
		//内部で使っている数学関数
		obj.Math = Math;
		return obj;
	})();
})();
Object.freeze(SVGGraph);

(function(){
	function mathjs(str){
		//余分なスペースを削除
		str = str.replace(/\s/g, "");
		//三角関数の逆関数を元に戻す
		if(str.indexOf("^-1")>=0){
			str = str.replace(/(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|sech|csch|coth)\^-1/g, "a$1");
		}
		//π
		str = str.replace(/π/g, "(π)");
		//√
		str = str.replace(/√/g, "rt");
		//°
		str = str.replace(/(-?(?:\d+|\d*\.\d+))°/g, "rad($1)");
		//*を挿入
		str = str.replace(/(^|\W)(\d*\.\d+|\d+)([A-Za-z\(])/g, "$1$2*$3");
		str = str.replace(/\)(\w|\()/g, ")*$1");
		//^の変換
		while(str.indexOf("^")>=0){
			str = replacePow(str);
		}
		//!の変換
		while(str.indexOf("!")>=0){
			str = replaceFactorial(str);
		}
		return str;
	}
	//^演算子をpow(べき乗)に変換する
	function replacePow(str){
		var p = str.lastIndexOf("^");
		//^の左部と右部に切り分ける
		var right = str.slice(p+1);
		var left = str.substring(0, p);
		//両辺の宣言部を取得する
		var rightExp = getRightPart(right);
		var leftExp = getLeftPart(left);
		//文字列を切り貼りしてステートメントを再構成する
		var result =
			left.substr(0, left.length-leftExp.length) + "pow(" + leftExp +"," + rightExp + ")" + right.slice(rightExp.length);
		return result;
	}
	//!階乗をfactorialに変換する
	function replaceFactorial(str){
		var p = str.indexOf("!");
		var right = str.slice(p+1);
		var left = str.substring(0, p);
		//左辺の宣言部を取得する
		var leftExp = getLeftPart(left);
		//文字列を切り貼りしてステートメントを再構成する
		var result = 
			left.substr(0, left.length-leftExp.length) + "factorial(" + leftExp + ")" + right;
		return result;
	}
	//右の宣言を取得する
	function getRightPart(str){
		var match = str.match(/^(?:-?(?:\d*\.\d+|\d+)|-?[A-Za-z]\w*(?:\.[A-Za-z]\w*)?|[A-Za-z]\w*)/);
		var part = match ? match[0]: "";
		if(str.charAt(part.length) != "("){
			return part;
		}else{
			//閉じ括弧の位置を判定
			var level = 0;
			var c;
			for(var i = part.length, len=str.length; i<len; i++){
				c = str.charAt(i);
				if(c=="("){level++;}
				if(c==")"){level--;}
				if(level == 0){
					break;
				}
			}
			return str.substr(0, i+1);
		}
	}
	//左の宣言を取得する
	function getLeftPart(str){
		//左辺が数値もしくは変数なら直ぐに返す
		var numMatch = str.match(/([A-Za-z]\w*|[A-Za-z]\w*\.[A-Za-z]\w*|-?(?:\d*\.\d+|\d+))$/);
		if(numMatch){return numMatch[0];}
		//括弧の範囲を取得
		var i=str.length-1;//最後の位置
		if(str.charAt(i)==")"){
			var level = 0;
			var c;
			for(true; i>=0; i--){
				c = str.charAt(i);
				if(c==")"){level++;}
				if(c=="("){level--;}
				if(level == 0){
					break;
				}
			}
			i--;
		}
		//残りの部分から関数名などを取得
		var remain = str.substring(0, i+1);
		var match = remain.match(/-?([A-Za-z]\w*(?:\.[A-Za-z]\w*)?|[A-Za-z]\w)*$/);
		var a = match ? match[0]: "";
		return a + str.slice(i+1);
	}
	//コンバーターを登録する
	SVGGraph.registerConverter(mathjs);
})();

//数学関数を拡張する
(function(){
	//登録の順番はそれほど重要ではありません．(循環しないように)
	//NOTE:大本のMathオブジェクトはwindow.Mathとして参照できます．
	var r = SVGGraph.registerMath;
	
	//定数
	//円周率
	r("pi", Math.PI);
	r("Pi", Math.PI);
	r("pI", Math.PI);
	r("π", Math.PI);
	//定数は小文字でも良しとする
	//自然対数の底
	r("e", Math.E);
	//2の自然対数
	r("ln2", Math.LN2);
	//10の自然対数
	r("ln10", Math.LN10);
	//2を底としたeの対数
	r("log2e", Math.LOG2E);
	//10を底としたeの対数
	r("log10e", Math.LOG10E);
	//2の平方根
	r("sqrt2", Math.SQRT2);
	//1/2の平方根
	r("sqrt1_2", Math.SQRT1_2);

	//論理否定
	r("not", function(x){return !x;});
	//根
	r("rt", function(x,a){a=a===undefined?2:a;return Math.pow(x, 1/a)});
	r("cbrt", function(x){return Math.sign(x)*Math.rt(Math.abs(x), 3)});

	//角度→ラジアン
	r("rad", function(deg){return deg/180*Math.PI;});
	//ラジアン→角度
	r("deg", function(rad){return rad/Math.PI*180;});
	
	//対数関数(a…底)
	r("log", function(x, a){
		if(a === undefined){a = Math.E;}
		return window.Math.log(x)/window.Math.log(a);
	});
	r("ln", function(x){return window.Math.log(x);})

	//三角関数
	r("sec", function(x){return 1/Math.cos(x);});
	r("csc", function(x){return 1/Math.sin(x);});
	r("cot", function(x){return 1/Math.tan(x);});
	
	//逆三角関数(a記法)
	r("asec", function(x){return Math.acos(1/x);});
	r("acsc", function(x){return Math.asin(1/x);});
	r("acot", function(x){return Math.atan(1/x);});

	//逆三角関数(arc記法)
	r("arcsin", function(x){return Math.asin(x);});
	r("arccos", function(x){return Math.acos(x);});
	r("arctan", function(x){return Math.atan(x);});
	r("arcsec", function(x){return Math.asec(x);});
	r("arccsc", function(x){return Math.acsc(x);});
	r("arccot", function(x){return Math.acot(x);});
	
	//双曲線関数
	r("sinh", function(x){return (Math.exp(x)-Math.exp(-x))/2;});
	r("cosh", function(x){return (Math.exp(x)+Math.exp(-x))/2;});
	r("tanh", function(x){return (Math.exp(x)-Math.exp(-x))/(Math.exp(x)+Math.exp(-x));});
	r("sech", function(x){return 1/Math.cosh(x);});
	r("csch", function(x){return 1/Math.sinh(x);});
	r("coth", function(x){return 1/Math.tanh(x);});
	
	//逆双曲線関数(a記法)
	r("asinh", function(x){return Math.log(x+Math.sqrt(x*x+1));});
	r("acosh", function(x){return Math.log(x+Math.sqrt(x*x-1));});
	r("atanh", function(x){return Math.log((1+x)/(1-x))/2;});
	r("asech", function(x){return Math.acosh(1/x);});
	r("acsch", function(x){return Math.asinh(1/x);});
	r("acoth", function(x){return Math.atanh(1/x);});
	
	//逆双曲線関数(arc記法)
	r("arcsinh", function(x){return Math.asinh(x);});
	r("arccosh", function(x){return Math.acosh(x);});
	r("arctanh", function(x){return Math.atanh(x);});
	r("arcsech", function(x){return Math.asech(x);});
	r("arccsch", function(x){return Math.acsch(x);});
	r("arccoth", function(x){return Math.acoth(x);});
	
	//符号関数
	r("sign", function(x){return x==0 ? 0 : (x<0 ? -1: 1);});

	//階乗
	r("factorial", function(n){
		if(n<0){return NaN;}
		if(n==0){return 1;}
		var result = 1;
		for(var i=1; i<=n; i++){
			result *= i;
		}
		return result;
	});
	//順列数
	r("P", function(n, r){return Math.factorial(n)/Math.factorial(n-r);});
	//組み合わせ数
	r("C", function(n, r){return Math.P(n,r)/Math.factorial(r)});

	//切り上げ
	r("floor", function(x, n){
		if(n===undefined){n=0;}
		var m = Math.pow(10, n);return window.Math.floor(x * m)/m;});
	//丸め
	r("round", function(x, n){
		if(n===undefined){n=0;}
		var m = Math.pow(10, n);return window.Math.round(x * m)/m;});
	//切り捨て
	r("ceil", function(x, n){
		if(n===undefined){n=0;}
		var m = Math.pow(10, n);return window.Math.ceil(x * m)/m;});

})();