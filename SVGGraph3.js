/* SVGGraph.js ver1.24
==============
�{�X�N���v�g��web�u���E�U��œ񎟌��֐��O���t��`�悷�邽�߂̂��̂ł��D
���Ȃ��L�q�Ŋ֐��O���t���L�q���邱�Ƃ��o���܂��D

��{�ƂȂ�A�C�f�B�A��Peter Jipsen����ASCIIsvg.js
http://www.chapman.edu/~jipsen/svg/ASCIIsvg.js
���瓾�Ă��܂����C�R�[�h�͑S�ăX�N���b�`����L�q���Ă��܂��D

�����:
firefox,chrome,opera,ie9+��(html5���T�|�[�g����u���E�U)
��ie8�ȑO�ł͓��삵�܂���D

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

�ȉ��ɒ�߂�����ɏ]���A�{�\�t�g�E�F�A����ъ֘A�����̃t�@�C���i�ȉ��u�\�t�g�E�F�A�v�j�̕������擾���邷�ׂĂ̐l�ɑ΂��A�\�t�g�E�F�A�𖳐����Ɉ������Ƃ𖳏��ŋ����܂��B����ɂ́A�\�t�g�E�F�A�̕������g�p�A���ʁA�ύX�A�����A�f�ځA�Еz�A�T�u���C�Z���X�A�����/�܂��͔̔����錠���A����у\�t�g�E�F�A��񋟂��鑊��ɓ������Ƃ������錠�����������Ɋ܂܂�܂��B

��L�̒��쌠�\������і{�����\�����A�\�t�g�E�F�A�̂��ׂĂ̕����܂��͏d�v�ȕ����ɋL�ڂ�����̂Ƃ��܂��B

�\�t�g�E�F�A�́u����̂܂܁v�ŁA�����ł��邩�Öقł��邩���킸�A����̕ۏ؂��Ȃ��񋟂���܂��B�����ł����ۏ؂Ƃ́A���i���A����̖ړI�ւ̓K�����A����ь�����N�Q�ɂ��Ă̕ۏ؂��܂݂܂����A����Ɍ��肳�����̂ł͂���܂���B ��҂܂��͒��쌠�҂́A�_��s�ׁA�s�@�s�ׁA�܂��͂���ȊO�ł��낤�ƁA�\�t�g�E�F�A�ɋN���܂��͊֘A���A���邢�̓\�t�g�E�F�A�̎g�p�܂��͂��̑��̈����ɂ���Đ������؂̐����A���Q�A���̑��̋`���ɂ��ĉ���̐ӔC������Ȃ����̂Ƃ��܂��B
*/

//non strict�֐�
//NOTE:use strict�̊֐��Ƃ͍��݂ł��Ȃ����ߕ������ĊǗ�����D
var SVGGraphNonStrict = (function(){
	//�֐��������function�Ƃ��Ď��s�\�Ƃ���D
	function toFunction(source, paramName, Math, mathjs, svg){
		var func;
		var m = Math;
		with(Math){eval("func = function(" + paramName + "){return " + mathjs(source) + ";};");}
		return func;
	}
	//������𐔒l�ɂ��ĕԂ��D
	function toValue(source, Math, mathjs, svg){
		if(typeof source == "number" || source instanceof Object){return source;}
		if(source === undefined || source === null || source == ""){return;}
		var result;
		var m = Math;
		with(Math){eval("result = " + mathjs(source) + ";");}
		//�^�`�F�b�N
		//NOTE:�����HTMLElement���Q�Ƃ���P�[�X������
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

//���W���[���{��
var SVGGraph = (function(){
	"use strict";

	//svg�̗��p�۔���
	var isSVGAvailable = !document.createElementNS 
		? false 
		: document.createElementNS("http://www.w3.org/2000/svg", "svg").viewBox !== undefined;
	if(!isSVGAvailable){return;}
	
	var SVG_NS = "http://www.w3.org/2000/svg";
	var XHTML_NS = "http://www.w3.org/1999/xhtml";
	
	//���p���I�������v�f���L���b�V������
	var elemCache = {};
	function cacheElem(name, elem){
		//������S�č폜
		var attrs = elem.attributes;
		for(var i = attrs.length-1; i>=0; i--){
			var attr = attrs[i];
			if(attr.name == "d"){
				elem.setAttribute(attr.name, "M0,0");//NOTE:chrome�΍�
			}else{
				elem.setAttribute(attr.name, "");//NOTE:ie�΍�
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

	//�m�[�h�𐶐�����
	var templates = {};
	function getElem(name, attributes){
		var result;
		//�g�p�ςݗv�f���ė��p����
		var freeList = elemCache[name];
		if(freeList && freeList.length>0){
			result = freeList.pop();
		}
		//������Ȃ������ꍇ
		if(!result){
			//�e���v���[�g��T��
			var template = templates[name];
			if(!template){
				//������Ȃ���΃e���v���[�g�Ƃ��ēo�^����D
				template = document.createElementNS(SVG_NS, name);
				templates[name] = template;
			}
			result = template.cloneNode(false);
		}
		//���������̎��ʎq��ǉ�
		result.setAttribute("auto-created", "true");
		//�����l�̐ݒ�
		return insertAttributes(result, attributes);
	}
	
	//HTML�v�f�𐶐�����
	function getXHTMLElem(name, attributes){
		var elem = document.createElementNS(XHTML_NS, name);
		elem.setAttribute("auto-created", "true");
		return insertAttributes(elem, attributes);
	}

	//�����l��}������
	function insertAttributes(elem, attributes){
		if(attributes){
			for(var i in attributes){
				elem.setAttribute(i, attributes[i]);
			}
		}
		return elem;
	}

	//�֐��Q
	var Math = (function(){
		//window.Math�I�u�W�F�N�g�̃N���[�������
		var obj = {};
		//�萔
		push(["E", "LN2", "LN10", "LOG2E", "LOG10E", "PI", "SQRT1_2", "SQRT2"]);
		//�֐�
		push(["abs", "acos", "asin", "atan", "atan2", 
			"ceil", "cos", "exp", "floor", "imul", 
			"log", "max", "min", "pow", "random", 
			"round", "sin", "sqrt", "tan"]);
		//Math�I�u�W�F�N�g����֐����R�s�[����D
		function push(arr){
			for(var i = 0, len = arr.length; i<len; i++){
				obj[arr[i]] = window.Math[arr[i]];
			}
		}
		return obj;
	})();
	//�Ǝ��֐��E�萔�̒ǉ�
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

	//�}�N��
	var _Macro = {};
	//�}�N���̓o�^
	function registerMacro(name, f){
		_Macro[name] = f;
	}
	
	//�����ݒ�E�I���ݒ�
	var _pre = function(){};
	function registerPresetting(f){
		_pre = f;
	}
	var _post = function(){};
	function registerPostsetting(f){
		_post = f;
	}

	//�}�[�J�[
	var Marker = {none: getElem("rect")};
	//�}�[�J�[��o�^����
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

	//�f�t�H���g�̃}�[�J�[��o�^����
	(function(){
		registerMarker(getElem("polygon", {points: "-5,0 -3,5 -5,10 5,5"}), "arrow", "warrow");
		registerMarker(getElem("circle", {cx: "5", cy:"5", r: "4"}), "dot", "circle");
		registerMarker(getElem("polygon", {points: "5,0 10,5 5,10 0,5"}), "dia", "wdia");
	})();

	//������ʒu�̐����ʒu���擾����
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
	
	//������ʒu�̐����ʒu���擾����
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

	//�y�[�W�Ɋ܂܂��O���t�S�̂�`�悷��
	//onload�C�x���g�Ŏ��s����郁�C������.
	//NOTE:���s����̂�svg�v�f�ɑ΂��Ĉ�x�̂�
	function main(){
		var svgs = document.querySelectorAll("svg[script]:not([graph])");
		for(var i = 0, len = svgs.length; i<len; i++){
			var svg = svgs[i];
			setup(svg);
		}
	}
	
	//�O���t�����Ɋւ��@�\��ǉ��E���s����
	function setup(svg){
		//���O����
		setupStyle(svg);
		//�R�A�@�\�̐ݒ�
		extendAPI(svg);
		drawGraph(svg);
		//�I�v�V�����@�\�̐ݒ�
		extendAnimAPI(svg);
		extendOutputAPI(svg);
		//GUI�@�\�̐ݒ�
		addMouseEvent(svg);
		addDragEvent(svg);
		createGUI(svg);
	}

	//�X�^�C���ݒ���s��
	var rgexCRLF = new RegExp("\r\n|\n", "g");
	function setupStyle(svg){
		svg.style.overflow = "hidden";
		//���s�R�[�h�̒���
		var script = svg.getAttribute("script");
		script = script.replace(rgexCRLF, "\r");
		svg.setAttribute("script", script);
		//�O���t�}���Ώۂ̑�����ݒ�
		var vp = svg.viewportElement ? svg.viewportElement: svg;
		vp.setAttribute("graph", "graph");
	}

	//svg�I�u�W�F�N�g��API�̊g�����s��
	function extendAPI(svg){
		//�����l
		var initialParams = [10];
		var currentParams = [10];
		var originalParams = [10];
		//�l��ݒ�E�擾����
		svg.param = function(i, value){
			if(i>=10){return;}
			if(value === undefined){
				return currentParams[i];
			}else{
				//�ϊ����ē����Ɋi�[
				if(value instanceof String){
					value = value !== null ? value.split(";")[0]: null;
				}
				currentParams[i] = SVGGraphNonStrict.toValue(value, Math, mathjs, svg);
			}
		};
		
		//�l��ݒ�E�擾����(slider�ɂ�)
		svg.slider = function(i, value){
			if(i>=10){return;}
			if(value === undefined){
				return originalParams[i];
			}else{
				//�ϊ����ē����Ɋi�[
				if(value instanceof String){
					value = value !== null ? value.split(";")[0]: null;
				}
				originalParams[i] = SVGGraphNonStrict.toValue(value, Math, mathjs, svg);
				}
				//svg.update();
		};

		
		
		//�����l��ۑ�
		for(var i = 0; i<10; i++){
			svg.param(i, svg.getAttribute("param" + i));
			initialParams[i] = currentParams[i];
		}
		
		//�p�����[�^�̈ꊇ�ϊ��֐�
		svg.params = function(){
			for(var i = 0, len = arguments.length; i<len && i<10 ; i++){
				svg.param(i, arguments[i]);
			}
		};
		
		var initialScript = svg.getAttribute("script");
		var currentScript = initialScript;
		//�X�N���v�g�̐ݒ�֐�
		svg.script = function(src){
			if(src === undefined){
				return currentScript;
			}
			currentScript = src;
		};

		//���e�����Z�b�g����
		svg.reset = function(){
			currentScript = initialScript;
			for(var i =0; i<10; i++){
				currentParams[i] = initialParams[i];
			}
			svg.update();
		};
	}
	//�o�͗pAPI���g������
	function extendOutputAPI(svg){
		//�����l���폜����
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
		//�\�[�X�R�[�h�̎擾�֐�
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
			//�X�^�C���̑}��
			cloned.insertBefore(getStyleElem(), cloned.firstChild);
			//��`svg�v�f�̑}��
			cloned.insertBefore(getDefinitionElem(), cloned.firstChild);
			//�T�C�Y���ݒ�̎��͌��݂̃T�C�Y���g���Đݒ肷��D
			var style = window.getComputedStyle(vp);
			if(vp.getAttribute("width")===null){
				cloned.setAttribute("width", style.width);
			}
			if(vp.getAttribute("height")===null){
				cloned.setAttribute("height", style.height);
			}
			//�V���A���C�Y����
			var serializer = new XMLSerializer();
			var source = serializer.serializeToString(cloned);
			//���O��Ԃ̒ǉ�(���݂��Ă����疳��)
			source = source.replace(/^<svg(?!.+xmlns.+>)/, '<svg xmlns="http://www.w3.org/2000/svg"');
			//xml�錾��ǉ�
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
					//NOTE:�v��Ȃ��Ȃ�����URL.revokeObjectURL���g���č폜���܂��傤
					try{
						var blob = new Blob([source], {type: "image/svg+xml"});
						return URL.createObjectURL(blob);
					}catch(e){
						return "data:image/svg+xml," + encodeURIComponent(source);
					}
			}
		};
	}
	//�A�j���[�V�����pAPI���g������
	function extendAnimAPI(svg){
		var requestAnimationFrame
			= window.requestAnimationFrame 
			|| window.mozRequestAnimationFrame
			|| window.webkitRequestAnimationFrame
			|| window.msRequestAnimationFrame
			|| function(func){setTimeout(func,100);};//��֊֐�
		//�A�j���[�V���������s����
		svg.anim = function(params, dur, freeze){
			if(dur === undefined || dur<=0){dur=5;}
			//�A�j���[�V������
			if(svg.animating){return;}
			//�p�����[�^��ϊ�
			translate(params);
			//�A�j���[�V�����J�n����
			var start = (new Date()).getTime();
			svg.animating = true;
			frame();
			function frame(){
				try{
					var current = (new Date()).getTime();
					var msec = current - start;
					var rate = msec/(1000*dur);
					if(rate<1){
						rate = window.Math.min(rate, 1);//����^�C�~���O�ɂ���Ă͒����Ă��܂��D
						rate = window.Math.max(rate, 0);
						set(rate);
						requestAnimationFrame(frame);
					}else{
						//�A�j���[�V�����I��
						svg.animating = undefined;
						if(freeze){set(1);}else{set(0);}
					}
				}catch(e){
					svg.animating = undefined;
					throw e;
				}
			}
			//�i�s�󋵂ɉ������`����s��
			function set(rate){
				for(var i = 0, len=params.length; i<len; i++){
					var param = params[i];
					if(param instanceof Array){
						var s = param[0];
						var e = param[1];
						svg.param(i, s + (e - s) * rate);
					}else{
						//�P��l�̃P�[�X�͂��̂܂�
						svg.param(i, param);
					}
				}
				//�A�j���[�V�������̓\�[�X�̍ĕ]���̕K�v�Ȃ�
				svg.update(true);
			}
		};
		function translate(params){
			for(var i=0, len=params.length; i<len; i++){
				var param = params[i];
				if(!(param instanceof Array)){
					;
					//���̂܂�
				}else if(param.length == 1){
					params[i] = param[0];
				}else{
					param[0] = SVGGraphNonStrict.toValue(param[0], Math, mathjs, svg);
					param[1] = SVGGraphNonStrict.toValue(param[1], Math, mathjs, svg);
				}
			}
		}
	}
	//�O���t����GUI���\�z����
	function createGUI(svg){
		placeGUI(svg);
		setVisibility(svg);
		registerBtnEvents(svg);
	}

	//GUI���i��z�u����
	function placeGUI(svg){
		var elems = {};
		elems.inputs = [];
		elems.spans = [];
		//UI���i�̃R���e�i
		var div = getXHTMLElem("div", {"class": "gui"});
		elems.div = div;
		//�e�L�X�g�G���A�𐶐�
		var ta = getXHTMLElem("textarea", {wrap: "off"});
		elems.textarea = ta;
		ta.textContent = svg.script();
		div.appendChild(ta);
		//���̓t�B�[���h�𐶐�
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
		//�{�^���𐶐�
		var bf = getXHTMLElem("span", {"class": "buttons"});
		elems.btnUpdate = getButton("�X�V");
		elems.btnReset = getButton("����");
		elems.btnStart = getButton("�J�n");
		elems.lnkSave = getLink("�ۑ�");
		elems.btnPng = getButton("�摜");
		div.appendChild(bf);
		//svg�v�f�̔w��ɔz�u
		var vp = svg.viewportElement ? svg.viewportElement : svg;
		vp.parentNode.insertBefore(div, vp.nextSibling);
		//�ϐ��Ɋi�[
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
	
	//GUI�̕\����\���𐧌䂷��
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
	//w:�������݂���,s:�X�N���v�g�\��,p:�p�����[�^�\��,l:�����N��\��,a:�A�j���[�V�����\,i:png�o��(�񐄏�)
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
		//�A�j���[�V�����̕��A�{�^��
		if(flags.match(/a/) && svg.getAttribute("freeze") == "true"){
			show(elems.btnReset);
		}
		(flags.match(/i/)? show: hide)(elems.btnPng);

		//���݂��Ȃ��p�����[�^�͉B��
		for(var i=0; i<10; i++){
			if(!svg.getAttribute("param"+i)){
				hide(elems.spans[i]);
			}
		}
	}
	
	//�C�x���g������ǉ�����D
	function registerBtnEvents(svg){
		var elems = svg.elems;
		//�X�V�{�^��
		elems.btnUpdate.addEventListener("click", function(){
			//textarea��input�v�f�̓��e�������߂�
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
			//�G���[���͉������Ȃ�
			if(errored){return;}
			svg.update();
			
		}, false);
		//���Z�b�g�{�^��
		elems.btnReset.addEventListener("click", function(){
			//textarea��input�v�f�̓��e�𕜌�����
			elems.textarea.value = elems.textarea.textContent;
			for(var i=0; i<10; i++){
				var input = elems.inputs[i];
				clearErr(input)
				input.value = input.getAttribute("value");
			}
			svg.reset();
		}, false);
		//�ۑ������N
		(function(){
			var prevSource;
			elems.lnkSave.addEventListener("mousedown", function(e){
				try{
					//�O��̓��e��j������
					URL.revokeObjectURL(prevSource);
				}catch(e){}
				var source = svg.getSource("url");
				prevSource = source;
				elems.lnkSave.href = source;
			}, false);
			//ie�΍�
			//see http://hebikuzure.wordpress.com/2012/12/16/file-api-%E3%81%A7%E4%BD%9C%E6%88%90%E3%81%97%E3%81%9F-blob-%E3%82%92%E3%83%80%E3%82%A6%E3%83%B3%E3%83%AD%E3%83%BC%E3%83%89%E3%81%99%E3%82%8B/
			if(window.navigator.msSaveBlob){
				elems.lnkSave.addEventListener("mousedown", function(e){
					var blob = svg.getSource("blob");
					window.navigator.msSaveOrOpenBlob(blob, "graph.svg"); 
				}, false);
			}
		})();
		//�J�n�{�^��
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
		//�摜�����N
		//NOTE:�Â�chrome�ł̓G���[������
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
						alert("png�`���ւ̕ϊ��Ɏ��s���܂����D");
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

	//�}�E�X�z�o�[�C�x���g��}������
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

		//���W��ݒ肷��
		function setPosition(x, y){
			var gX = svg.graphX(x);
			var gY = svg.graphY(y);
			svg.setAttribute("graphX", gX);
			svg.setAttribute("graphY", gY);
			if(display && id !== null && id != ""){
				display.textContent = "(" + gX + "," + gY + ")";
			}
		}
		//�O���t�ł̍��W���擾����
		svg.getGraphX = function(){return svg.getAttribute("graphX");};
		svg.getGraphY = function(){return svg.getAttribute("graphY");};
	}
	
	//�}�E�X�h���b�O�C�x���g��}������
	function addDragEvent(svg){
		//���[�h����
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
			if(!confirm("���ɖ߂��܂��D��낵���ł���?")){return;}
			svg.slide(0, 0);
			x = 0; y = 0;
			svg.update();
		}, false);

		function move(e){
			svg.slide(e.clientX - sx + x, e.clientY - sy + y);		
			svg.update();
		}
	}

	//�}�[�J�[id�̃O���[�o���J�E���^
	var markerCount = 0;
	//�P��̃O���t��`�悷�邽�߂�API���`����
	function drawGraph(svg){
				
		//�X�^�C��
		var style, mStyle, tStyle, aStyle;
		//�O���t�̈�ݒ�
		var setting = new graphSetting();
		//�}�N�������̃X�R�[�v�ɓW�J����
		var Macro = translateMacro();
		//main�����ŌĂяo���t�@���N�V�����̃L���b�V��
		var f,pre,post;
		//eval�Ő��������t�@���N�V�����̃L���b�V��
		var funcCache = {};
		//�R�[���o�b�N�֐�
		var callback = function(){};
		var cp = {};
		
		//api���g������
		function extendAPI(){
			//���C���������O���Ɍ��J
			svg.update = main;
			//���W�ϊ��E�X�P�[���ϊ��֐������J
			svg.graphX = function(svgX){return setting.graphX(svgX);}
			svg.graphY = function(svgY){return setting.graphY(svgY);}
			svg.posX = function(x){return setting.posX(x);}
			svg.posY = function(y){return setting.posY(y);}
			svg.scaleX = function(width){return setting.scaleX(width);}
			svg.scaleY = function(height){return setting.scaleY(height);}
			svg.setCallback = function(f){callback = f;}
			svg.slide = function(x, y){setting.slideX = x;setting.slideY = y;}
			svg.clear = clear;
			//�O������R�}���h�����s����ꍇ
			svg.commands = function(commandName){
				var func = eval(commandName);
				return func;
			}
			//�O������}�N�������s����ꍇ
			svg.macros = function(macroName){
				return Macro[macroName];
			}
		}

		//���C������
		//repeating�c��͕s�v�̏ꍇ��true��n��
		function main(repeating){
			initStyle();
			//�O���t�̓��e������������
			clear();
			//�X�N���v�g�����s����
			var h;
			for(var i in cp){
				delete cp[i];
			}
			try{
				h = svg.suspendRedraw(1000);			
				var m = Math;
				if(!repeating){
					setting.init(svg);	
					//�֐��̃L���b�V�����N���A
					funcCache = {};
					//�\�[�X���R���p�C��
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
			//�R�[���o�b�N�֐������s
			callback(svg, cp);
		}
		
		//�X�^�C���ݒ������������
		function initStyle(){
			
			//�}�`��`�悷��ۂɂ��̃X�^�C�����Q�Ƃ���(��������/�ǉ��\)
			style = {
				fill: "none",
				stroke: "black",
				strokeWidth: 1
			};
			//�}�[�J�[�X�^�C��
			mStyle = {
				size: 10,
				color: "inherit",
				fill: "white"
			};
			//�������`�悷��ۂɂ��̃X�^�C�����Q�Ƃ���(��������/�ǉ��\)
			tStyle = {
				fontStyle: "normal",
				fontSize: 13
			};
			//���W���X�^�C��
			aStyle = {
				axisStroke: "black",
				axisWidth: 2,
				gridStroke: "darkGray",
				gridWidth: 1,
				indexSize: 10
			};
		}

		//�}�N�������̃X�R�[�v�Ŏ��s�\�Ƃ���D
		//NOTE:function�I�u�W�F�N�g����Usource�����Ă���eval����
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
		//�O���t�͈͂�ݒ肷��
		function setRange(xMin, xMax, yMin, yMax){
			xMin = fix(xMin);
			xMax = fix(xMax);
			yMin = fix(yMin);
			yMax = fix(yMax);
			setting.setRange(xMin, xMax, yMin, yMax);
			//�����̓��e��p������
			clear()
		}
		//�O���t�͈͂���`�͈͂Őݒ肷��
		function setRangeAsRect(x, y, width, height){
			x = fix(x);
			y = fix(y);
			width = fix(width);
			height = fix(height);
			setRange(x, x+width, y, y+height);
		}

		//�����ŗ��p�\�Ȋ֐��Q
		//�֐��ɂ��O���t��`�悷��
		//�������Ɋ֐���n��
		//(1)Function��n��
		//(2)�ϐ��\�L(�ϐ���x�Œ�)�̕�����
		//(3)�}��ϐ��\�L(�ϐ���t�Œ�)�̕�����
		function plot(func, from, to, pCount, markerStart, markerEnd){
			var result = functionToPoints(func, from, to, pCount);
			return path(result, false, markerStart, markerEnd);
		}
		
		//�O���t��x���Ƃ̊Ԃ̗̈�𐶐����܂��D
		function area(func, from, to, pCount){
			var result = functionToPoints(func, from, to, pCount);
			result.unshift([result[0][0], 0]);
			result.push([result[result.length-1][0], 0]);
			var p = path(result);
			p.style.stroke = "none";
			append(p);
			return p;
		}

		//eval�Ő�������function�I�u�W�F�N�g���������ɕۑ�����D
		//NOTE:�A�j���[�V�������ɑ�ʂ�function����������C���������������邽��
		function getFunc(source, paramName){
			var id  = source + ":" + paramName;
			var func = funCache[id];
			if(!func){
				func = SVGGraphNonStrict.toFunction(source, paramName, Math, mathjs, svg);
				funcCache[id] = func;
			}
			return func;
		}
		//�\�[�X������function�I�u�W�F�N�g�����߂�
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
		
		//�֐������Ƀp�����[�^���X�g�ɑΉ�������W�̃��X�g�����߂�
		function getPoints(funcs, params){
			var point;
			var points = [];
			if(!params){return [];}
			for(var i = 0, len = params.length; i<len; i++){
				point = getPoint(funcs, params[i]);
				//�s���ȍ��W�̔���
				if(isValid(point[0]) && isValid(point[1])){
					points.push(point);
				}
			}
			return points;
			//�l�����W�Ƃ��Đ��������ǂ����𔻒肷��
			function isValid(value){
				return !isNaN(value) && (window.Math.abs(value) != Infinity);
			}
		}
		//���W�ϊ����s��
		function getPoint(funcs, t){
			return [funcs.fx(t), funcs.fy(t)];
		}
		
		//�֐��𒸓_�̃��X�g�ɕϊ�����
		function functionToPoints(func, from, to, pCount){
			from = fix(from, setting.minX);
			to = fix(to, setting.maxX);
			if(pCount == undefined || pCount<=0){pCount = 1000;}
			var result = {};
			//�ϊ��֐������߂�
			var funcs = translateFunc(func);
			//�֐����ߎ�����
			var params = [];
			for(var i = 0; i<=pCount; i++){
				params.push(from + (to-from)/pCount*i);
			}
			return getPoints(funcs, params);
		}
		
		//2���֐��̏o�͂��s��
		//���ʂ�ό`�����悤�Ȍ��ʂ�������D
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
			//s���Œ肵��t�𓮂���
			var gs = getElem("g", {"class": "sfixed"});
			for(i = 0; i<=freq; i++){
				fx = getSFixed(pfx, sFrom + (sTo-sFrom)/freq*i);
				fy = getSFixed(pfy, sFrom + (sTo-sFrom)/freq*i);
				points = functionToPoints([fx, fy], tFrom, tTo, pCount);
				gs.appendChild(path(points, false));
			}
			g.appendChild(integrateStyle(gs));
			//t���Œ肵��s�𓮂���
			var gt = getElem("g", {"class": "tfixed"});
			for(i = 0; i<=freq; i++){
				fx = getTFixed(pfx, tFrom + (tTo-tFrom)/freq*i);
				fy = getTFixed(pfy, tFrom + (tTo-tFrom)/freq*i);
				points = functionToPoints([fx, fy], sFrom, sTo, pCount);
				gt.appendChild(path(points, false));
			}
			g.appendChild(integrateStyle(gt));
			return append(g);
			//2�ϐ��̊֐��ŕЕ��̕ϐ����Œ肵���֐����擾����
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
		
		//��{�}�`�̕`��
		//����(����)������
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
		
		//��������������
		function iline(x1, y1, x2, y2){
			return _line(true, x1, y1, x2, y2);
		}
		
		//������������
		function hline(x1, y1, x2, y2, markerStart){
			return _line(false, x1, y1, x2, y2, markerStart);
		}
		
		//����������(���ʊ֐�)
		function _line(isFull, x1, y1, x2, y2, markerStart){
			x1 = fix(x1, 0);
			y1 = fix(y1, 0);
			x2 = fix(x2, 0);
			y2 = fix(y2, 0);
			if(x1==x2 && y1==y2){return line(x1, y1, x2, y2);}
			//�����̃P�[�X
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
			//�X��
			var slope = (y2-y1)/(x2-x1);
			//�ؕ�
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
		
		//�ΐ�������(����)
		function slope(x, y, rad, length, markerStart, markerEnd){
			return _slope(line, x, y, rad, length, markerStart, markerEnd);
		}
		
		//�ΐ�������(��������)
		function islope(x, y, rad){
			return _slope(iline, x, y, rad, 1);
		}
		
		//�ΐ�������(������)
		function hslope(x, y, rad, markerStart){
			return _slope(hline, x, y, rad, 1, markerStart);
		}
		
		//�ΐ�������(���ʊ֐�)
		function _slope(func, x, y, rad, length, markerStart, markerEnd){
			x = fix(x, 0);
			y = fix(y, 0);
			rad = fix(rad, 0);
			length = fix(length, 1);
			return func(x, y, x + length*Math.cos(rad), y + length*Math.sin(rad), markerStart, markerEnd);
		}
		
		//�p�X�E�܂����`�悷��
		function path(points, isClosed, markerStart, markerEnd){
			if(typeof points == "string"){
				points = str(points);
			}
			//���_�����Ȃ���΃��C���������Ȃ�
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
		
		//�^�[�g���O���t�B�b�N��`�悷��
		//NOTE:�n�_���w�肵�����ƁC�����̑����Ƌ����̃��X�g��n�����ƂŃp�X��\������
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

		//�~��`�悷��
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

		//�ȉ~��`�悷��
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

		//�~�ʐ�^���ʊ֐�
		function getArcFunc(cx, cy, rx, ry){
			cx = fix(cx, 0);
			cy = fix(cy, 0);
			rx = fix(rx, 1);
			ry = fix(ry, 1);
			return ["cos(t)*" + rx + "+" + cx, "sin(t)*" + ry + "+" + cy];
		}
		//�~�ʂ�`�悷��
		function arc(cx, cy, rx, ry, from, to, markerStart, markerEnd){
			from = fix(from, 0);
			to = fix(to, window.Math.PI * 2);
			var func = getArcFunc(cx, cy, rx, ry);
			var pCount = Math.floor(Math.abs(from - to)/Math.PI*180);
			return treatMarker(plot(func, from, to, pCount), markerStart, markerEnd);
		}
		//��^��`�悷��
		function pie(cx, cy, rx, ry, from, to){
			from = fix(from, 0);
			to = fix(to, window.Math.PI * 2);
			var func = getArcFunc(cx, cy, rx, ry);
			var pCount = Math.floor(Math.abs(from - to)/Math.PI*180);
			var points = functionToPoints(func, from, to, pCount);
			points.unshift([cx, cy]);
			return path(points, true);
		}
		
		//��`��`�悷��
		function rect(x, y, width, height, rx, ry){
			x = fix(x, 0);
			y = fix(y, 0);
			width = fix(width, 1);
			height = fix(height, 1);
			rx = fix(rx, 0);
			ry = fix(ry, 0);
			var r = getStyledElem("rect");
			//���̒l���w��\�Ƃ���
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
		
		//��������`�悷��
		function horizon(y){
			return line(setting.minX, y, setting.maxX, y);
		}
		//��������`�悷��
		function vertical(x){
			return line(x, setting.minY, x, setting.maxY);
		}
		
		//�������`�悷��
		function textSingleLine(x, y, str, pos, fontSize){
			x = fix(x, 0);
			y = fix(y, 0);
			var tA;
			var fSize = (fontSize === undefined) ? tStyle.fontSize: fontSize;
			var dy;	
			//�e�L�X�g�z�u
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
			//NOTE:�o����2px���x��ɂ��炷�Ƃ������肭��(baseline�̖��)
			var t = getElem("text", {x: setting.posX(x), y: setting.posY(y)+dy-2});
			applyStyle(t, tStyle);
			//text�ɂ��Ă�px�����Ȃ��Ɛ��������삵�Ȃ��D
			t.style.fontSize = fSize + "px";
			var style = t.style;
			style.textAnchor = tA;
			t.textContent = str;
			return append(t);
		}
		
		//�����s�e�L�X�g�̕`��
		//\n�ŉ��s���܂��D
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

		//�}�[�J�[��`�̂��߂̊֐��Q
		//�}�[�J�[����舵��
		function treatMarker(elem, markerStart, markerEnd){
			if(markerStart!==undefined && markerStart != "none"){
				appendMarker(elem, markerStart, false);				
			}
			if(markerEnd!==undefined && markerEnd != "none"){
				appendMarker(elem, markerEnd, true);				
			}
			return elem;
		}
		//�}�[�J�[��}������
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
		//�}�[�J�[�p�̐}�`�𐶐�����
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
			//�}�[�J�[�ɓ_���͖��p
			shape.style.strokeDasharray = "";
			shape.className.value = "marker";
			return shape;
			function getMarkerColor(){
				return mStyle.color == "inherit" ? style.stroke: mStyle.color;
			}
		}

		//���W�w�����s��
		//format�ɂ̓��x����������w�肵�܂�{{x}},{{y}}�̕����͍��W�ɒu���������܂��D
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
			//�t���e�L�X�g
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
		
		//���W�w���̈ꊇ�o�͂��s��
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
		
		//���_����̋����O���b�h��\������
		function distance(gridStyle, d, max, skip){
			//���ɑ��݂����牽�����Ȃ��D
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

			//�i�q�Ɩڐ�
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

			//��
			g.appendChild(gAxis);
			elem = line(0,0,setting.maxX,0);
			style = elem.style;
			style.shapeRendering = "crispEdges";
			style.stroke = aStyle.axisStroke;
			style.strokeWidth = aStyle.axisWidth;

			//�K�w�\�����܂Ƃ߂�
			g.appendChild(gGrid);
			g.appendChild(gAxis);
			g.appendChild(gIndex);
			return append(g);
		}

		//�O���t�`��̂��߂̕⏕�֐�
		//���W����`�悷��
		function axis(gridStyle, dx, dy, skipX, skipY){
			//���ɑ��݂����牽�����Ȃ��D
			if(svg.querySelector("g.axisSet")){return;}
			
			dx = fix(dx, 0);
			dy = fix(dy, 0);
			gridStyle = fixStr(gridStyle, "none");
			skipX = fix(skipX, -1);
			skipY = fix(skipY, -1);
			//�i�q�̕`�����W
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
			//�i�q�̕`��
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

			//���W���̕`��
			var gAxis = getElem("g", {"class": "axis"});
			gAxis.appendChild(line(setting.minX, 0, setting.maxX, 0));
			gAxis.appendChild(line(0, setting.minY, 0, setting.maxY));
			integrateStyle(gAxis);
			setStyle(gAxis, true);

			//�ڐ��̒ǉ�
			var ind = index(dx, dy, skipX, skipY);
			
			//�v�f���܂Ƃ߂�
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
		
		//�ڐ���`�悷��
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

		//�^�C�g����}������
		function title(str){
			var t = getElem("title");
			t.textContent = str;
			return append(t);
		}

		//���߂�}������
		function desc(str){
			var d = getElem("desc");
			d.textContent = str;
			return append(d);
		}
		
		//svg�̃p�X������𒼐ڑ}������
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
				//���W���C��
				var segs = p.pathSegList;
				for(var i=0, len=segs.numberOfItems; i<len; i++){
					var seg = segs.getItem(i);
					translate(seg, seg.pathSegType%2==0? abs: rel);
				}
				append(p);
			}
		})();
		
		//�m�[�h��}������
		function append(node){
			svg.appendChild(node);
			return node;
		}
		//�m�[�h�����W���̔w�ʂɑ}������
		function bg(node){
			var axis = svg.querySelector("g.axisSet");
			svg.insertBefore(node, axis);
			return node;
		}
		//���e���N���A����
		function clear(){
			clearSvg(svg);
		}

		//�X�^�C���ݒ���s�����v�f���擾����
		function getStyledElem(name){
			var elem = getElem(name);
			return applyStyle(elem, style);
		}
		
		//������𐔒l�������͂��̔z��ɕϊ�����
		function val(expression, arrayOnly){
			//���̎���z��̃\�[�X�`���ɕϊ�
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
		//������𕶎���������͂��̔z��ɕϊ�����
		function str(expression){
			return val(expression, true);
		}
		//�z��̓��e���ċA�I�ɕ]������
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

		//���𐔒l�ɕϊ�����
		function toValue(expression){
			return SVGGraphNonStrict.toValue(expression, Math, mathjs, svg);
		}

		//����`�l�ɑ΂���K��l��Ԃ�
		function fix(val, defaultVal){
			var result = toValue(val);
			return result === undefined || result == null ? defaultVal : result;
		}
		//����`�l�ɑ΂���K��l��Ԃ��i������̃P�[�X�j
		function fixStr(val, defaultVal){
			return (val === undefined 
				|| val == null 
				|| (val instanceof String && val == "")) ? defaultVal : val+"";
		}

		//api�����J����
		extendAPI()
		//���C�������̎��s
		main();
	}

	//�v�f�ɃX�^�C����K�p����
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

	//�v�f�̃X�^�C�����W�񂷂�
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

	//�O���t�̓��e���N���A����
	//�X�N���v�g�ɂ�莩���������ꂽ���݂̂̂��폜����
	function clearSvg(svg){
		svg.removeAttribute("title");
		var nodes = svg.querySelectorAll("svg *[auto-created=true]");
		for(var i = 0, len = nodes.length; i<len; i++){
			var node = nodes[i];
			node.parentNode.removeChild(nodes[i]);
			//���̂܂ܔj�������ė��p����
			cacheElem(node.tagName, node);
		}
	}
	
	//�O���t�ݒ�̎擾
	function graphSetting(svg){}
	(function(proto){
		proto.init = function(svg){
			if(!svg.viewportElement){
				caseViewport(svg, this);
			}else{
				caseNested(svg, this);
			}
			//���̃R�[�h�����s�\�ȃR�[�h�Ƃ���D
			this.script = svg.script().replace(/\{\{(\d)\}\}/g, "(svg.param($1))");
		};
		//svg�v�f�̏ꍇ
		function caseViewport(svg, me){
			var size = getViewportSize(svg);
			setSize(svg, size, me);
		}
		//����q��svg�v�f�̏ꍇ
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
		//�r���[�|�[�gsvg�v�f�̑傫�����擾����
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
		//��{�ƂȂ�`��T�C�Y��K�p����
		function setSize(svg, size, me){
			me.width = size.width;
			me.height = size.height;
			me.setRange(-me.width/2, me.width/2, -me.height/2, me.height/2);
			if(svg.getAttribute("viewBox") == null){
				svg.setAttribute("viewBox", [0, 0, me.width, me.height].join(" "));
			}
		}
		//�O���t�̃X���C�h�l
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

		//�p�����[�^�ݒ�̊m�F���s��
		function check(me){
			if(me.minX >= me.maxX){throw "parameter error:maxX must be grater than minX."}
			if(me.minY >= me.maxY){throw "parameter error:maxY must be grater than minY."}
		}
		
		//�������擾����D
		function getAttr(svg, name, defaultValue){
			var value = svg.getAttribute(name);
			return value != null ? value.split("px")[0] * 1 : defaultValue;
		}

		//�O���t���W��svg���W�ɕϊ�����
		proto.posX = function(x){
			return round((x - this.minX) * this.unitX);
		};
		proto.posY = function(y){
			return round(this.height - (y - this.minY) * this.unitY);
		}
		//svg���W���O���t���W�ɕϊ�����
		proto.graphX = function(x){
			return round(x / this.unitX + this.minX);
		};
		proto.graphY = function(y){
			return round((this.height - y)/this.unitY + this.minY);
		}
		//�O���t�T�C�Y��svg�T�C�Y�ɕϊ�����
		proto.scaleX = function(x){
			return round(x * this.unitX);
		};
		proto.scaleY = function(y){
			return round(y * this.unitY);
		};
		function round(value){
			//�O���t�`��ɂ͏����_�ȉ�2�����x�ŏ\��
			return window.Math.round(value*100)/100;
		}
	})(graphSetting.prototype);

	//�C�x���g�����o�^
	(function(){
		document.addEventListener("DOMContentLoaded", main, true);
	})();
	
	//�ϊ��֐�
	var mathjs = function(str){return str;}

	//�ϊ��֐��͌ォ��ύX�ł���D
	function registerConverter(f){mathjs = f;}

	//�O���Ɍ��J����C���^�[�t�F�[�X
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
		//�����Ŏg���Ă��鐔�w�֐�
		obj.Math = Math;
		return obj;
	})();
})();
Object.freeze(SVGGraph);

(function(){
	function mathjs(str){
		//�]���ȃX�y�[�X���폜
		str = str.replace(/\s/g, "");
		//�O�p�֐��̋t�֐������ɖ߂�
		if(str.indexOf("^-1")>=0){
			str = str.replace(/(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh|sech|csch|coth)\^-1/g, "a$1");
		}
		//��
		str = str.replace(/��/g, "(��)");
		//��
		str = str.replace(/��/g, "rt");
		//��
		str = str.replace(/(-?(?:\d+|\d*\.\d+))��/g, "rad($1)");
		//*��}��
		str = str.replace(/(^|\W)(\d*\.\d+|\d+)([A-Za-z\(])/g, "$1$2*$3");
		str = str.replace(/\)(\w|\()/g, ")*$1");
		//^�̕ϊ�
		while(str.indexOf("^")>=0){
			str = replacePow(str);
		}
		//!�̕ϊ�
		while(str.indexOf("!")>=0){
			str = replaceFactorial(str);
		}
		return str;
	}
	//^���Z�q��pow(�ׂ���)�ɕϊ�����
	function replacePow(str){
		var p = str.lastIndexOf("^");
		//^�̍����ƉE���ɐ؂蕪����
		var right = str.slice(p+1);
		var left = str.substring(0, p);
		//���ӂ̐錾�����擾����
		var rightExp = getRightPart(right);
		var leftExp = getLeftPart(left);
		//�������؂�\�肵�ăX�e�[�g�����g���č\������
		var result =
			left.substr(0, left.length-leftExp.length) + "pow(" + leftExp +"," + rightExp + ")" + right.slice(rightExp.length);
		return result;
	}
	//!�K���factorial�ɕϊ�����
	function replaceFactorial(str){
		var p = str.indexOf("!");
		var right = str.slice(p+1);
		var left = str.substring(0, p);
		//���ӂ̐錾�����擾����
		var leftExp = getLeftPart(left);
		//�������؂�\�肵�ăX�e�[�g�����g���č\������
		var result = 
			left.substr(0, left.length-leftExp.length) + "factorial(" + leftExp + ")" + right;
		return result;
	}
	//�E�̐錾���擾����
	function getRightPart(str){
		var match = str.match(/^(?:-?(?:\d*\.\d+|\d+)|-?[A-Za-z]\w*(?:\.[A-Za-z]\w*)?|[A-Za-z]\w*)/);
		var part = match ? match[0]: "";
		if(str.charAt(part.length) != "("){
			return part;
		}else{
			//�����ʂ̈ʒu�𔻒�
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
	//���̐錾���擾����
	function getLeftPart(str){
		//���ӂ����l�������͕ϐ��Ȃ璼���ɕԂ�
		var numMatch = str.match(/([A-Za-z]\w*|[A-Za-z]\w*\.[A-Za-z]\w*|-?(?:\d*\.\d+|\d+))$/);
		if(numMatch){return numMatch[0];}
		//���ʂ͈̔͂��擾
		var i=str.length-1;//�Ō�̈ʒu
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
		//�c��̕�������֐����Ȃǂ��擾
		var remain = str.substring(0, i+1);
		var match = remain.match(/-?([A-Za-z]\w*(?:\.[A-Za-z]\w*)?|[A-Za-z]\w)*$/);
		var a = match ? match[0]: "";
		return a + str.slice(i+1);
	}
	//�R���o�[�^�[��o�^����
	SVGGraph.registerConverter(mathjs);
})();

//���w�֐����g������
(function(){
	//�o�^�̏��Ԃ͂���قǏd�v�ł͂���܂���D(�z���Ȃ��悤��)
	//NOTE:��{��Math�I�u�W�F�N�g��window.Math�Ƃ��ĎQ�Ƃł��܂��D
	var r = SVGGraph.registerMath;
	
	//�萔
	//�~����
	r("pi", Math.PI);
	r("Pi", Math.PI);
	r("pI", Math.PI);
	r("��", Math.PI);
	//�萔�͏������ł��ǂ��Ƃ���
	//���R�ΐ��̒�
	r("e", Math.E);
	//2�̎��R�ΐ�
	r("ln2", Math.LN2);
	//10�̎��R�ΐ�
	r("ln10", Math.LN10);
	//2���Ƃ���e�̑ΐ�
	r("log2e", Math.LOG2E);
	//10���Ƃ���e�̑ΐ�
	r("log10e", Math.LOG10E);
	//2�̕�����
	r("sqrt2", Math.SQRT2);
	//1/2�̕�����
	r("sqrt1_2", Math.SQRT1_2);

	//�_���ے�
	r("not", function(x){return !x;});
	//��
	r("rt", function(x,a){a=a===undefined?2:a;return Math.pow(x, 1/a)});
	r("cbrt", function(x){return Math.sign(x)*Math.rt(Math.abs(x), 3)});

	//�p�x�����W�A��
	r("rad", function(deg){return deg/180*Math.PI;});
	//���W�A�����p�x
	r("deg", function(rad){return rad/Math.PI*180;});
	
	//�ΐ��֐�(a�c��)
	r("log", function(x, a){
		if(a === undefined){a = Math.E;}
		return window.Math.log(x)/window.Math.log(a);
	});
	r("ln", function(x){return window.Math.log(x);})

	//�O�p�֐�
	r("sec", function(x){return 1/Math.cos(x);});
	r("csc", function(x){return 1/Math.sin(x);});
	r("cot", function(x){return 1/Math.tan(x);});
	
	//�t�O�p�֐�(a�L�@)
	r("asec", function(x){return Math.acos(1/x);});
	r("acsc", function(x){return Math.asin(1/x);});
	r("acot", function(x){return Math.atan(1/x);});

	//�t�O�p�֐�(arc�L�@)
	r("arcsin", function(x){return Math.asin(x);});
	r("arccos", function(x){return Math.acos(x);});
	r("arctan", function(x){return Math.atan(x);});
	r("arcsec", function(x){return Math.asec(x);});
	r("arccsc", function(x){return Math.acsc(x);});
	r("arccot", function(x){return Math.acot(x);});
	
	//�o�Ȑ��֐�
	r("sinh", function(x){return (Math.exp(x)-Math.exp(-x))/2;});
	r("cosh", function(x){return (Math.exp(x)+Math.exp(-x))/2;});
	r("tanh", function(x){return (Math.exp(x)-Math.exp(-x))/(Math.exp(x)+Math.exp(-x));});
	r("sech", function(x){return 1/Math.cosh(x);});
	r("csch", function(x){return 1/Math.sinh(x);});
	r("coth", function(x){return 1/Math.tanh(x);});
	
	//�t�o�Ȑ��֐�(a�L�@)
	r("asinh", function(x){return Math.log(x+Math.sqrt(x*x+1));});
	r("acosh", function(x){return Math.log(x+Math.sqrt(x*x-1));});
	r("atanh", function(x){return Math.log((1+x)/(1-x))/2;});
	r("asech", function(x){return Math.acosh(1/x);});
	r("acsch", function(x){return Math.asinh(1/x);});
	r("acoth", function(x){return Math.atanh(1/x);});
	
	//�t�o�Ȑ��֐�(arc�L�@)
	r("arcsinh", function(x){return Math.asinh(x);});
	r("arccosh", function(x){return Math.acosh(x);});
	r("arctanh", function(x){return Math.atanh(x);});
	r("arcsech", function(x){return Math.asech(x);});
	r("arccsch", function(x){return Math.acsch(x);});
	r("arccoth", function(x){return Math.acoth(x);});
	
	//�����֐�
	r("sign", function(x){return x==0 ? 0 : (x<0 ? -1: 1);});

	//�K��
	r("factorial", function(n){
		if(n<0){return NaN;}
		if(n==0){return 1;}
		var result = 1;
		for(var i=1; i<=n; i++){
			result *= i;
		}
		return result;
	});
	//����
	r("P", function(n, r){return Math.factorial(n)/Math.factorial(n-r);});
	//�g�ݍ��킹��
	r("C", function(n, r){return Math.P(n,r)/Math.factorial(r)});

	//�؂�グ
	r("floor", function(x, n){
		if(n===undefined){n=0;}
		var m = Math.pow(10, n);return window.Math.floor(x * m)/m;});
	//�ۂ�
	r("round", function(x, n){
		if(n===undefined){n=0;}
		var m = Math.pow(10, n);return window.Math.round(x * m)/m;});
	//�؂�̂�
	r("ceil", function(x, n){
		if(n===undefined){n=0;}
		var m = Math.pow(10, n);return window.Math.ceil(x * m)/m;});

})();