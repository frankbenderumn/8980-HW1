// import * as Algo from './algorithms.js';
// import { Debug } from '../utils/debug.js.js.js.js.js';
// import { WSApi } from '../system/socket.js';
// import { Automate } from '../cinematic/automate.js.js.js.js.js';
let cursor = {
    x: 0,
    y: 0,
    drag: undefined
};

let mouseState = {
    left: false,
    right: false,
    middle: false
};

let debug = false;

let mousePressed;

const _lut = [];

for ( let i = 0; i < 256; i ++ ) {
	_lut[ i ] = ( i < 16 ? '0' : '' ) + ( i ).toString( 16 );
}

let systemState = "default";
let focusVertex = undefined;
let nodeEditor = undefined;

/** 
 * Draws a rounded rectangle using the current state of the canvas.  
 * If you omit the last three params, it will draw a rectangle  
 * outline with a 5 pixel border radius  
 * @param {Number} x The top left x coordinate 
 * @param {Number} y The top left y coordinate  
 * @param {Number} width The width of the rectangle  
 * @param {Number} height The height of the rectangle 
 * @param {Object} radius All corner radii. Defaults to 0,0,0,0; 
 * @param {Boolean} fill Whether to fill the rectangle. Defaults to false. 
 * @param {Boolean} stroke Whether to stroke the rectangle. Defaults to true. 
 */
CanvasRenderingContext2D.prototype.roundRect = function (x, y, width, height, radius, fill, stroke) {
    var cornerRadius = { upperLeft: radius, upperRight: radius, lowerLeft: radius, lowerRight: radius };
    if (typeof stroke == "undefined") {
        stroke = true;
    }
    // if (typeof radius === "object") {
    //     for (var side in radius) {
    //         cornerRadius[side] = radius[side];
    //     }
    // }

    this.beginPath();
    this.moveTo(x + cornerRadius.upperLeft, y);
    this.lineTo(x + width - cornerRadius.upperRight, y);
    this.quadraticCurveTo(x + width, y, x + width, y + cornerRadius.upperRight);
    this.lineTo(x + width, y + height - cornerRadius.lowerRight);
    this.quadraticCurveTo(x + width, y + height, x + width - cornerRadius.lowerRight, y + height);
    this.lineTo(x + cornerRadius.lowerLeft, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - cornerRadius.lowerLeft);
    this.lineTo(x, y + cornerRadius.upperLeft);
    this.quadraticCurveTo(x, y, x + cornerRadius.upperLeft, y);
    this.closePath();
    if (stroke) {
        this.stroke();
    }
    if (fill) {
        this.fill();
    }
} 

// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
function generateUUID() {

	const d0 = Math.random() * 0xffffffff | 0;
	const d1 = Math.random() * 0xffffffff | 0;
	const d2 = Math.random() * 0xffffffff | 0;
	const d3 = Math.random() * 0xffffffff | 0;
	const uuid = _lut[ d0 & 0xff ] + _lut[ d0 >> 8 & 0xff ] + _lut[ d0 >> 16 & 0xff ] + _lut[ d0 >> 24 & 0xff ] + '-' +
			_lut[ d1 & 0xff ] + _lut[ d1 >> 8 & 0xff ] + '-' + _lut[ d1 >> 16 & 0x0f | 0x40 ] + _lut[ d1 >> 24 & 0xff ] + '-' +
			_lut[ d2 & 0x3f | 0x80 ] + _lut[ d2 >> 8 & 0xff ] + '-' + _lut[ d2 >> 16 & 0xff ] + _lut[ d2 >> 24 & 0xff ] +
			_lut[ d3 & 0xff ] + _lut[ d3 >> 8 & 0xff ] + _lut[ d3 >> 16 & 0xff ] + _lut[ d3 >> 24 & 0xff ];

	// .toLowerCase() here flattens concatenated strings to save heap memory space.
	return uuid.toLowerCase();

}

// function create_inspector() {
//     let modal = document.createElement("div");
//     modal.className = "slim modal";
//     modal.setAttribute("id", "node-inspector");
//     let modalBox = document.createElement("div");
//     modalBox.className = "slim modal-box";
//     modal.style.display = 'none';
//     modal.append(modalBox);
//     document.body.append(modal);
// }

class Style {
    constructor() {
        this._color = "black";
        this._background = undefined;
        this._height = "auto";
        this._width = "auto";
        this._display = "block";
        this._fontFamily = "serif";
        this._fontSize = "16px";
    }

    get background() { return this._background; }
    get height() { return this._height; }
    get width() { return this._width; }
    get display() { return this._display; }
    get color() { return this._color; }
    get fontSize() { return this._fontSize; }
    get fontFamily() { return this._fontFamily; }

    set background(val) { this._background = val; }
    set height(val) { this._height = val; }
    set width(val) { this._width = val; }
    set display(val) { this._display = val; }
    set color(val) { this._color = val; }
    set fontSize(val) { this._fontSize = val; }
    set fontFamily(val) { this._fontFamily = val; }

}

let defaultStyle = new Style();

class Text {
    constructor(style) {
        this.style = style;
    }

    draw(text, x, y, ctx) {
        ctx.font = `${this.style.fontSize} ${this.style.fontFamily}`;
        ctx.font = "16px serif";
        ctx.fillStyle = this.style.color;
        ctx.fillText(text, x, y);       
    }
}

class Widget {
    constructor(x, y, width, height, text, type, target, node) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.text = text;
        this.type = type;
        this.target = target;
        this.node = node; 
        this.state = undefined;
        this.textEngine = new Text(defaultStyle);
        this.backgroundColor = "black";
        this.color = "white";
        this.hoverable = false;
        this.hoverState = "#ffffff";
        this.clickable = false;
        this.draggable = false;
    }

    draw(x, y, ctx) {
        this.x = x;
        this.y = y;
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.fillRect(x, y, this.width, this.height); 
        let w = ctx.measureText(this.text).width;
        let h = ctx.measureText(this.text).actualBoundingBoxAscent + ctx.measureText(this.text).actualBoundingBoxDescent;
        let gutterW = (this.width - w) / 2;
        let gutterH = (this.height - h);
        this.textEngine.draw(this.text, x + gutterW, y + gutterH, ctx);
    }

    click() {
        switch(this.type) {
            case "modal":
                this.node.inspect(this.target);
                break;
            default:
                break;
        }
    }

    hover(color) {
        this.color = "red";
    }

    unhover() {
        this.color = "white";
    }

    get bounds() {
        return [this.x, this.y, this.x + this.width, this.y + this.height];
    }

    set bounds(val) {}

    get position() { return [this.x, this.y]; }

    set position(val) {
        this.x = val[0];
        this.y = val[1];
    }
}

class Vertex {
    constructor(x, y, radius, system, flag = "none") {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.hovering = false;
        this.hoverState = undefined;
        this.type = "circle";
        this._node = undefined;
        this.flag = flag;
        this.edge = undefined;
        this.connected = false;
        this.pair = undefined;
        this.parent = undefined;
        this.system = system;
        if (flag == "input") {
            this.color = "#ff00ff";
        } else if (flag == "output") {
            this.color = "#00ffff";
        }
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);        
        ctx.fill();

        if (this.edge != undefined) {
            if (this.connected) {
                this.edge.drawEdge(this, this.pair, ctx);
            } else {
                this.edge.drawRay(ctx);
            }
        }
    }

    getEdge() { return this.edge; }
    setEdge(val) { this.edge = val; }

    get bounds() {
        return [this.x, this.y, this.radius];
    }

    get position() { return [this.x, this.y]; }

    set position(val) {
        this.x = val[0];
        this.y = val[1];
    }

    get node() { return this._node; }

    set node(val) {
        this._node = val;
    }

    setPosition(val) {
        this.x = val[0];
        this.y = val[0];
    }

    clearEdge() {
        this.edge = undefined;
    }

    hover(color) {
        this.hoverState = this.color;
        this.color = color;
        this.hovering = true;
    }

    connect(vertex) {
        this.connected = true; 
        this.pair = vertex;
        this.system.addEdge([this, vertex]);
    }

    unhover() {
        if (this.flag == "input") {
            this.color = "#00ff00";
        } else if (this.flag == "output") {
            this.color = "#0000ff";
        }
        this.hovering = false;
        this.hoverState = undefined;
    }

    click() {
        if (this.edge == undefined) {
            this.edge = new Edge([this.x, this.y], [cursor.x, cursor.y], this.system, this.node, "cursor");
        }

        if (systemState == "edgeConstruction" && this.flag == "input") {
            this.edge.setB([this.x, this.y]);
            focusVertex.connect(this);
        } else {
            systemState = "edgeConstruction";
            focusVertex = this;
        }
    }
}

class Edge {
    constructor(a, b, system, nodeA = undefined, nodeB = undefined) {
        this.a = a;
        this.b = b;
        this.tempVertex = undefined;
        this.system = system;
        if (nodeB == "cursor") {
            this.connected = false;            
        } else if (nodeB instanceof Node) {
            console.log("Connecting two vertices!");
        } else {
            console.log("Edge :: ignoring nodeB constructor parameter for now!");
        }
    }

    drawRay(ctx) {
        // this.a = [start.x, start.y];
        // this.b = [end.x, end.y];
        ctx.strokeStyle = "#00ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.a[0], this.a[1]);
        ctx.lineTo(this.b[0], this.b[1]);
        ctx.stroke();

        if (!this.connected) {
            this.tempVertex = new Vertex(this.b[0], this.b[1], 5, this.system, "edge");
        }
    }

    drawEdge(start, end, ctx) {
        this.a = [start.x, start.y];
        this.b = [end.x, end.y];
        ctx.strokeStyle = "#00ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.a[0], this.a[1]);
        ctx.lineTo(this.b[0], this.b[1]);
        ctx.stroke();

        if (!this.connected) {
            this.tempVertex = new Vertex(this.b[0], this.b[1], 5, this.system, "edge");
        }
    }

    setB(cursor) {
        this.b[0] = cursor.x;
        this.b[1] = cursor.y;
    }

    setA(cursor) {
        this.a[0] = cursor.x;
        this.a[1] = cursor.y;
    }
}

class Node {
    constructor(x, y, system, type="input", ticker="undefined") {
        this._id = generateUUID();
        this.name = "undefined";
        this.width = 150;
        this.height = 100;
        this.system = system;
        this.x = x;
        this.y = y;
        if (ticker != "undefined") {
            this._label = ticker;
        } else if (type == "index") {
            this._label = ticker
        } else {
            this._label = type;
        }
        this._text = "parameters";
        this._widgets = [];
        this.inputEdges = [];
        this.outputEdges = [];
        this.vertexRadius = 8;
        this.heightStack = 0;
        this.vertices = [];
        this.inputVertices = [];
        this.outputVertices = [];
        this._type = type;
        this.paddingX = 25;
        this.paddingY = 0;
        this._focus = false;
        this.textEngine = new Text(defaultStyle);
        if (this._type == "function" || this._type == "index") { this.height = 100; }
        // Debug.color("green", "Should be initializing vertices");
        this.initVertices();
        this.initWidgets();
        this.initText();
    }

    draw(ctx) {
        ctx.fillStyle = "#ffffff";
        if (this._type == "output") { ctx.fillStyle = "#ffff55"; }
        if (this._type == "index") { ctx.fillStyle = "#55ffff"; }
        if (this._type == "function") { ctx.fillStyle = "#ff55ff"; }
        // shadow
        if (this._focus == true) {
            ctx.shadowColor = '#ccc500';
        } else {
            ctx.shadowColor = '#373737';
        }
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.roundRect(this.x, this.y, this.width, this.height, 5, true, false);
        ctx.fill();
        ctx.shadowColor = '#898';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        this.drawText(ctx);
        this.drawWidgets(ctx);
        this.drawVertices(ctx);
        this.drawEdges(ctx);
        // this.drawMenu(ctx);
        // this.drawEllipsis(ctx);
    }

    set focus(val) {
        this._focus = val;
    }

    get focus() {
        return this._focus;
    }

    getIn() {
        return this.inputVertices[0];
    }

    getOut() {
        return this.outputVertices[0];
    }

    drawWidgets(ctx) {
        let widW = 75;
        let widH = 25;
        let val = (this.height - widH) + this.y - 10;
        for (let i = 0; i < this._widgets.length; i++) {
            let alignW = (this.width - widW) / 2;
            this._widgets[i].draw(this.x + alignW, val, ctx);
        }
    }

    drawText(ctx) {
        // ctx.font = '48px serif';
        // ctx.fillStyle = "#000000";
        // ctx.fillText(this.label, this.x, this.y + 48);
        this.textEngine.draw(this._label, this.x + this.paddingX, this.y + this.paddingY + 25, ctx);
        // ctx.font = '24px serif';
        // ctx.fillText(this.text, this.x, this.y + 48 + 48);
        this.textEngine.draw(this._text, this.x + this.paddingX, this.y + 45 + this.paddingY, ctx);
    }

    drawVertices(ctx) {
        this.calculateVertices();
        for (let i = 0; i < this.inputVertices.length; i++) {
            this.inputVertices[i].draw(ctx);
        }

        if (this.type != "output") {
            for (let i = 0; i < this.outputVertices.length; i++) {
                this.outputVertices[i].draw(ctx);
            }
        }
    }

    drawEdges(ctx) {
        for (let i = 0; i < this.inputEdges.length; i++) {
            this.inputEdges[i].draw(ctx);
        }

        for (let i = 0; i < this.outputEdges.length; i++) {
            this.outputEdges[i].draw(ctx);        
        }
    }

    initText() {
        this.heightStack += 16;
    }

    initWidgets() {
        let widW = 75;
        let widH = 25;
        let alignW = (this.width - widW) / 2;
        let w = new Widget(this.x + alignW, this.heightStack, widW, widH, "Edit", "modal", `#${this._type}-node-inspector`, this);
        this._widgets.push(w);
        this.heightStack += widH;
        // let w2 = new Widget(this.x + alignW, this.heightStack, widW, widH, "!ellipsis", "modal", `#${this.type}-node-inspector`)
        // this._widgets.push(w2);
    }

    initVertices() {
        // Debug.color("orange", "Intializing vertices");
        console.log(this.system);
        let i = new Vertex(this.x, this.y + this.height / 2, this.vertexRadius, this.system, "input");
        let o = new Vertex(this.x + this.width, this.y + this.height / 2, this.vertexRadius, this.system, "output");
        // let inVertex = {type: "circle", bounds: [this.x, this.y + this.height / 2], radius: this.vertexRadius, node: this};
        // let outVertex = {type: "circle", bounds: [this.x + this.width, this.y + this.height / 2], radius: this.vertexRadius, node: this};
        i.node = this;
        o.node = this;
        this.inputVertices.push(i);
        this.outputVertices.push(o);
    }

    calculateVertices() {
        for (let i = 0; i < this.inputVertices.length; i++) {
            let v = this.inputVertices[i];
            v.position = [this.x, this.y + ((this.height / (this.inputVertices.length + 1)) * (i + 1))];
        }

        for (let i = 0; i < this.outputVertices.length; i++) {
            let v = this.outputVertices[i];            
            v.position = [this.x + this.width, this.y + ((this.height / (this.outputVertices.length + 1)) * (i + 1))];
        }
    }

    addVertex(flag) {
        if (flag == "input") {
            let inVertex = {type: "circle", bounds: [this.x, this.y + this.height / (this.inputVertices.length + 1) ], radius: this.vertexRadius, node: this};
        } else if (flag == "output") {
            let outVertex = {type: "circle", bounds: [this.x + this.width, this.y + this.height / (this.outputVertices.length + 1) ], radius: this.vertexRadius, node: this};
        }
    }

    inspect(target) {
        switch(this._type) {
            case "input":
                break;
            case "output":
                break;
            case "index":
                break;
            case "function":
                break;
            case "model":
                break;
            default:
                break;
        }

        let self = this;
        // $("form#node-inspector-form div").each(function(){
        //     if ($(this).attr('data-role') == "node-form") {
        //         if ($(this).attr('data-type') != self._type) {
        //             $(this).hide();
        //         } else {
        //             $(this).attr('data-unique', self._id);
        //             $(this).show();
        //         }
        //     }
        // });

        // $("form[data-role='node-modal'] *").each(function(){
        //     $(this).attr('data-unique', self._id);
        // });

        // $("[data-role=current-node-id]").each(function(){
        //     $(this).html(self._id);
        // });

        // $("form[data-role='node-modal']").each(function(){
        //     let subs = $(this).children();
        //     let self = $(this);
        //     self.attr('data-unique', this._id);
        //     if (debug) console.log(subs.length);
        //     subs.each(function(){
        //         let tag = $(this).prop("tagName");
        //         if (debug) console.log("TAG IS: "+tag);
        //         if ($(this).attr('data-parameter') == 'label') {
        //             $(this).html(this._label);
        //         }
        //         if (tag == "SELECT") {
        //             $(this).attr('data-role', 'node-selector');
        //             $(this).on('change', function(){
        //                 let nodeId = $(this).attr('data-unique');
        //                 let value = $(this).val();
        //                 let node = nodeEditor.getById(nodeId);
        //                 if (debug) console.log(`%c ${value}`, "color: crimson;");
        //                 node.text = value;
        //                 if (debug) console.log(`%c width is ${w}`, "color: orange;");
        //             });
        //         }
        //     });
        // });

        // if (debug) console.log("does this work?");
        // $("#modal-depth").attr('value', 2);
        // $(target).show();

        // $("form#node-inspector-form *").each(function(){
        //     let tag = $(this).prop("tagName");
        //     $(this).attr('data-node', self._id);
        //     if (tag == "SELECT") {
        //         $(this).attr('data-role', 'node-selector');
        //         $(this).on('change', function(){
        //             let nodeId = $(this).attr('data-node');
        //             let value = $(this).value();
        //             let node = nodeEditor.getById(nodeId);
        //             if (debug) console.log(`%c ${value}`, "color: crimson;");
        //             node.text(value);
        //             if (debug) console.log(`%c width is ${w}`, "color: orange;");
        //         });
        //     }

        // });
    }

    toJson() {
        let result = {
            id: this._id,
            x: this.x,
            y: this.y,
            type: this._type,
            width: this.width,
            height: this.height,
            label: this._label,
        };
        return result;
    }

    get bounds() { return [this.x, this.y, this.x + this.width, this.y + this.height]; }

    get widgets() { return this._widgets; }
    set widgets(val) { this._widgets = val; }
    
    get vertices() { 
        let t = this.inputVertices.concat(this.outputVertices);
        return t; 
    }

    get type() { return this._type; }
    set type(val) { this._type = val; }
    
    set vertices(val) { } 

    get inputColor() { return this._inputColor; }
    set inputColor(val) { this._inputColor = val; }

    get outputColor() { return this._outputColor; }
    set outputColor(val) { this._outputColor = val; }

    get position() { return [this.x, this.y]; }
    set position(val) { this.x = val[0]; this.y = val[1]; }

    set label(val) { this._label = val; }
    get label() { return this._label; }

    set text(val) { this._text = val; }
    get text() { return this._text; }

    setX(val) { this.x = val; }
    setY(val) { this.y = val; }

    set id(val) { this._id = val; }
    get id() { return this._id; }

} export { Node };

class NodeEditor {
    constructor(container, canvas, ui, width, height, graphVis) {
        this.container = document.getElementById(container);
        this.canvas = document.getElementById(canvas);
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.width = width;
        this.canvas.style.height = height;
        this.width = width;
        this.height = height;
        this.size = 5;
        this.nodes = [];
        this.edges = [];
        this.draggables = [];
        this.hoverables = [];
        this.clickables = [];
        this.nodeHash = new Map();
        this.focusNodeId = undefined;
        this.graphVis = graphVis;
        this.ui = document.getElementById(ui);
        nodeEditor = this;
    }

    background() {
        let linesX = this.width / this.size;
        this.ctx.strokeStyle = "#888888ff";
        for (let i = 0; i <= linesX; i++) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 1;
            
            // If line represents X-axis draw in different color
            // (i == this.xAxis) ? this.ctx.strokeStyle = "#ffffff" : this.ctx.strokeStyle = "#333333";
            
            if (i == linesX) {
                this.ctx.moveTo(0, this.size*i);
                this.ctx.lineTo(this.width, this.size*i);
            } else {
                this.ctx.moveTo(0, this.size*i+0.5);
                this.ctx.lineTo(this.width, this.size*i+0.5);
            }
            this.ctx.stroke();
        }

        let linesY = this.height / this.size;
        for (let i = 0; i <= linesY; i++) {
            this.ctx.beginPath();
            this.ctx.lineWidth = 1;
            
            // If line represents Y-axis draw in different color
            // (i == this.yAxis) ? this.ctx.strokeStyle = "#ffffff" : this.ctx.strokeStyle = "#333333";
            
            if(i == linesY) {
                this.ctx.moveTo(this.size*i, 0);
                this.ctx.lineTo(this.size*i, this.height);
            } else {
                this.ctx.moveTo(this.size*i+0.5, 0);
                this.ctx.lineTo(this.size*i+0.5, this.height);
            }
            this.ctx.stroke();
        }
    }

    toolbar() {}

    init() {
        if (debug) console.log('initializing node editor');
        this.background();
        this.handler();
        this.loop();
    }

    tick() {}

    distance(a, b) {
        return Math.sqrt(Math.pow((b[0] - a[0]),2) + Math.pow((b[1] - a[1]), 2));
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.background();
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].draw(this.ctx);
        }
    }

    getById(id) {
        let node = this.nodeHash.get(id);
        if (debug) console.log("Yippeeeeeeeeee");
        if (debug) console.log(this.nodeHash.size);
        if (debug) console.log(node);
        return node;
    }

    collide() {
        let self = this;
        for (let i = 0; i < self.draggables.length; i++) {
            let b = self.draggables[i].node.bounds;
            if (cursor.x >= b[0] && cursor.x <= b[2] &&
              cursor.y >= b[1] && cursor.y <= b[3]) {
                self.draggables[i].node.inspect();
                this.focusNodeId = self.draggables[i].node.id;
                self.draggables[i].node.focus = true;
                cursor.drag = self.draggables[i].node;
            } 
            else {
                self.draggables[i].node.focus = false;
            }
        }
    }

    click() {
        let self = this;
        for (let i = 0; i < self.clickables.length; i++) {
            let el = self.clickables[i];
            if (el.type == "circle") {
                let c = [cursor.x, cursor.y];
                if (this.distance(c, el.bounds) <= el.radius) {
                    el.click();
                }
            } else {
                if (cursor.x >= el.bounds[0] && cursor.x <= el.bounds[2] &&
                cursor.y >= el.bounds[1] && cursor.y <= el.bounds[3]) {
                    if (el.type == "modal") {
                        el.click();
                        if (debug) console.log("%c Modal button being clicked!", "color: orange; background: green;");
                    } else {
                        cursor.drag = self.clickables[i].node;
                    }
                }
            }
        }
    }

    hover() {
        let self = this;
        for (let i = 0; i < self.hoverables.length; i++) {
            let el = self.hoverables[i];
            if (el.type == "circle") {
                let c = [cursor.x, cursor.y];
                if (this.distance(c, el.bounds) <= el.radius) {
                    el.hover("#ffff00");
                } else {
                    el.unhover();
                }
            } else {
                if (cursor.x >= el.bounds[0] && cursor.x <= el.bounds[2] &&
                cursor.y >= el.bounds[1] && cursor.y <= el.bounds[3]) {
                    if (el.type == "modal") {
                        el.hover("#3333ff");
                    } else {
                        cursor.drag = self.hoverables[i].node;
                    }
                } else {
                    el.unhover();
                }
            }
        }
    }

    inspector(params) {
        let panel = document.getElementById("node-inspector");
    }

    handler() {
        let self = this;
        this.canvas.addEventListener("click", function() {
            if (debug) console.log("clicking canvas!");
        });

        this.canvas.addEventListener("mousedown", function(e) {
            switch (e.which) {
                case 1:
                    mouseState.left = true;
                    self.collide();
                    self.click();
                    break;
                case 2:
                    mouseState.middle = true;
                    if (systemState == "edgeConstruction") {
                        systemState = "default";
                        focusVertex.clearEdge();
                        focusVertex = undefined;
                    }
                    break;
                case 3:
                    mouseState.right = true;
                    break;
            }
            mousePressed = true;
        });

        this.canvas.addEventListener("mouseup", function(e) {
            switch (e.which) {
                case 1:
                    mouseState.left = false;
                    break;
                case 2:
                    mouseState.middle = false;
                    break;
                case 3:
                    mouseState.right = false;
                    break;
            }
            mousePressed = false;
            cursor.drag = undefined;
        });

        this.canvas.addEventListener('mousemove', (e) => {
                let ctxBnd = this.canvas.getBoundingClientRect();
                cursor.x = (e.clientX - ctxBnd.left);
                cursor.y = (e.clientY - ctxBnd.top);

                if (cursor.drag != undefined) {
                    cursor.drag.position = [cursor.x, cursor.y];
                }

                if (systemState == "edgeConstruction") {
                    focusVertex.edge.setB(cursor);
                }

                // BVH? 
                self.hover();
        });
    }

    loop() {
        this.tick();
        this.draw();
        requestAnimationFrame(this.loop.bind(this));
    }

    addNode(type, ticker = "undefined", script = "undefined") {
        let a = 50;
        let b = 50;
        if (debug) console.log(type);
        let node;
        if (ticker != "undefined") {
            node = new Node(a, b, this, type, ticker);
        } else {
            node = new Node(a, b, this, type);
        }

        if (script != "undefined") {
            console.log("do something");
            node.setX(script.x);
            node.setY(script.y);
            node.type = script.type;
            node.width = script.width;
            node.height = script.height;
            node.label = script.label;
            node.id = script.id;
        }

        this.nodes.push(node);
        let o = {
            node: node,
            type: "rect",
            role: "node"
        };
        this.draggables.push(o);
        let t = this.hoverables.concat(node.vertices);
        this.hoverables = t;
        this.clickables = t;

        if (debug) console.log("Verify node widgets length > 0 :: " + node.widgets.length);
        if (debug) console.log(node.widgets[0]);
        this.clickables.push(node.widgets[0]);
        this.hoverables.push(node.widgets[0]);

        this.nodeHash.set(node.id, node);
    }

    addEdge(nodes) {
        this.edges.push([nodes[0], nodes[1]]);
    }

    bridge(vertexA, vertexB) {

    }

    new() {

    }

    run() {
        console.log("Running node editor");
        console.log("nodes length: " + this.nodes.length);
        console.log(this.nodes);
        console.log("edges length: " + this.edges.length);
        console.log(this.edges);

        let outputs = [];
        this.nodes.forEach((e) => {
            if (e.type == "output") {
                outputs.push(e);                
            }
        });

        if (this.edges.length == 0 && this.nodes.length != 0) {
            // Debug.modal("Nodes exist without any edges");
        } else if (this.nodes.length == 0 && this.edges.length == 0) {
            // Debug.modal("Please create a script to run!");
        }

        if (outputs.length == 0) {
            // Debug.modal("Output node required!");
        } else if (outputs.length > 1) {
            console.log("Need to find links!");
        } else {
            let id = outputs[0].id;
            console.log("Parsing edges!");
            console.log(outputs[0]);
            console.log(`Id being looked for is ${id}`);
            this.edges.forEach((e) => {
                let o = e[1].node.id;
                let i = e[0].node.id;
                console.log(`Inputs and outputs are: ${i} and ${o}`);
                if (o == id) {
                    // Debug.color("magenta", "Edge match!");
                    let n = this.getById(i);
                    console.log(`Node type is ${n.type}`);
                    switch (n.type) {
                        case "input":
                            // straight to visualizer
                            console.log(`%c Adding chart ${n.label}:${n.parameter} to graph vis`, "color: magenta;");
                            n.label.toLowerCase();
                            if (n.parameter == undefined) {
                                n.parameter = "price";
                            }
                            this.graphVis.add(n.label, "price", "useless");
                            break;
                        case "index":
                            // straight to visualizer
                            break;
                        case "function":
                            // recurse to calculate function on children
                            break;
                        case "model":
                            // recurse to run model on children
                            break;
                        default:
                            // Debug.modal("Invalid type on the output node input");
                            break;
                    }
                }
            });
            // this.graphVis.extendz();
        }
    }

    save(scriptName = "default") {
        console.log("saving node editor!");
        let api = new WSApi();
        let _script = this.generateScript();
        // console.log(JSON.stringify(_script));
        api.sendCommand("saveStocketScript", {script: JSON.stringify(_script), path: `web/js/jsm/stocket/scripts/${scriptName}.json`} ).then(function(data) {
            console.log(data);
            if (data.status == "success") {
                console.log("BOOOOOOOOOAY!");
                $.fn.notify(0, `Script ${scriptName} successfully saved!`);
            } else {
                console.log('die pendejo!');
            }
        });
    }

    load() {
        let self = this;
        let api = new WSApi();
        console.log("loading node editor!");
        api.sendCommand("getStocketAll", {status: "ignore"}).then(function(data){
            console.log(data);
            let arr = data.result.toString().split("\n");
            console.log(arr);
            arr.forEach((el) => {
                let li = document.createElement("li");
                li.innerText = el;
                li.setAttribute("data-path", el);
                li.addEventListener("click", function(){
                    api.sendCommand("getStocketScript", {script: `web/js/jsm/stocket/scripts/${el}`}).then(function(data2){
                        let y = data2.result;
                        console.log(y);
                        self.runScript(y);
                    });
                });
                document.getElementById('stocket-load-directory').append(li);
            });
        });
    }

    generateScript() {
        console.log("generating script!");
        let nodesArr = [];
        let edgesArr = [];
        this.nodes.forEach((node) => {
            nodesArr.push(node.toJson());
        });
        this.edges.forEach((edge) => {
            // console.log(edge);
            edgesArr.push({a: edge[0].node.id, b: edge[1].node.id});
        });
        let script = {
            nodes: nodesArr,
            edges: edgesArr
        };
        return script;
    }

    runScript(cool) {
        let json = JSON.parse(cool);
        console.log(json);
        this.clear();
        this.generateNodes(json.nodes);
        this.generateEdges(json.edges);
    }

    generateNodes(nodes) {
        console.log("Generating nodes!");
        nodes.forEach((node) => {
            this.addNode(node.type, "undefined", node);
        });
    }

    generateEdges(edges) {
        console.log("Generating edges!");
        console.log(edges);
        edges.forEach((edge) => {
            let i = this.nodeHash.get(edge.a).getOut();
            let o = this.nodeHash.get(edge.b).getIn();
            i.connect(o); 
            if (i.getEdge() == undefined) {
                console.log("Edge does not exist yet");
                i.setEdge(new Edge([i.x, i.y], [cursor.x, cursor.y], this, i.node, "cursor"));
            } else {
                i.getEdge().setB([o.x, o.y]);
            }
        });
    }

    clear() {
        this.edges = [];
        this.nodes = [];
    }

    get graphs() { return this.graphVis; }
    set graphs(val) { this.graphVis = val; }


} export { NodeEditor };