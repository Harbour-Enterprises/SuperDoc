"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var ARG_LENGTH = {
  a: 7,
  c: 6,
  h: 1,
  l: 2,
  m: 2,
  q: 4,
  s: 4,
  t: 2,
  v: 1,
  z: 0
};
var SEGMENT_PATTERN = /([astvzqmhlc])([^astvzqmhlc]*)/gi;
var NUMBER = /-?[0-9]*\.?[0-9]+(?:e[-+]?\d+)?/gi;
function parseValues(args) {
  const numbers = args.match(NUMBER);
  return numbers ? numbers.map(Number) : [];
}
function parsePath(path) {
  const data = [];
  const p = String(path).trim();
  if (p[0] !== "M" && p[0] !== "m") {
    return data;
  }
  p.replace(SEGMENT_PATTERN, (_, command, args) => {
    const theArgs = parseValues(args);
    let type = command.toLowerCase();
    let theCommand = command;
    if (type === "m" && theArgs.length > 2) {
      data.push([theCommand, ...theArgs.splice(0, 2)]);
      type = "l";
      theCommand = theCommand === "m" ? "l" : "L";
    }
    if (theArgs.length < ARG_LENGTH[type]) {
      return "";
    }
    data.push([theCommand, ...theArgs.splice(0, ARG_LENGTH[type])]);
    while (theArgs.length >= ARG_LENGTH[type] && theArgs.length && ARG_LENGTH[type]) {
      data.push([theCommand, ...theArgs.splice(0, ARG_LENGTH[type])]);
    }
    return "";
  });
  return data;
}
function rotatePoint(point, angle) {
  const nx = point.x * Math.cos(angle) - point.y * Math.sin(angle);
  const ny = point.y * Math.cos(angle) + point.x * Math.sin(angle);
  point.x = nx;
  point.y = ny;
}
function translatePoint(point, dx, dy) {
  point.x += dx;
  point.y += dy;
}
function scalePoint(point, s) {
  point.x *= s;
  point.y *= s;
}
var Path2D = class _Path2D {
  constructor(path) {
    this.commands = [];
    if (path && path instanceof _Path2D) {
      this.commands.push(...path.commands);
    } else if (path) {
      this.commands = parsePath(path);
    }
  }
  addPath(path) {
    if (path && path instanceof _Path2D) {
      this.commands.push(...path.commands);
    }
  }
  moveTo(x, y) {
    this.commands.push(["M", x, y]);
  }
  lineTo(x, y) {
    this.commands.push(["L", x, y]);
  }
  arc(x, y, r, start, end, ccw) {
    this.commands.push(["AC", x, y, r, start, end, !!ccw]);
  }
  arcTo(x1, y1, x2, y2, r) {
    this.commands.push(["AT", x1, y1, x2, y2, r]);
  }
  ellipse(x, y, rx, ry, angle, start, end, ccw) {
    this.commands.push(["E", x, y, rx, ry, angle, start, end, !!ccw]);
  }
  closePath() {
    this.commands.push(["Z"]);
  }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
    this.commands.push(["C", cp1x, cp1y, cp2x, cp2y, x, y]);
  }
  quadraticCurveTo(cpx, cpy, x, y) {
    this.commands.push(["Q", cpx, cpy, x, y]);
  }
  rect(x, y, width, height) {
    this.commands.push(["R", x, y, width, height]);
  }
  roundRect(x, y, width, height, radii) {
    if (typeof radii === "undefined") {
      this.commands.push(["RR", x, y, width, height, 0]);
    } else {
      this.commands.push(["RR", x, y, width, height, radii]);
    }
  }
};
function buildPath(ctx, commands) {
  let x = 0;
  let y = 0;
  let endAngle;
  let startAngle;
  let largeArcFlag;
  let sweepFlag;
  let endPoint;
  let midPoint;
  let angle;
  let lambda;
  let t1;
  let t2;
  let x1;
  let y1;
  let r;
  let rx;
  let ry;
  let w;
  let h;
  let pathType;
  let centerPoint;
  let ccw;
  let radii;
  let cpx = null;
  let cpy = null;
  let qcpx = null;
  let qcpy = null;
  let startPoint = null;
  let currentPoint = null;
  ctx.beginPath();
  for (let i = 0; i < commands.length; ++i) {
    pathType = commands[i][0];
    if (pathType !== "S" && pathType !== "s" && pathType !== "C" && pathType !== "c") {
      cpx = null;
      cpy = null;
    }
    if (pathType !== "T" && pathType !== "t" && pathType !== "Q" && pathType !== "q") {
      qcpx = null;
      qcpy = null;
    }
    let c;
    switch (pathType) {
      case "m":
      case "M":
        c = commands[i];
        if (pathType === "m") {
          x += c[1];
          y += c[2];
        } else {
          x = c[1];
          y = c[2];
        }
        if (pathType === "M" || !startPoint) {
          startPoint = { x, y };
        }
        ctx.moveTo(x, y);
        break;
      case "l":
        c = commands[i];
        x += c[1];
        y += c[2];
        ctx.lineTo(x, y);
        break;
      case "L":
        c = commands[i];
        x = c[1];
        y = c[2];
        ctx.lineTo(x, y);
        break;
      case "H":
        c = commands[i];
        x = c[1];
        ctx.lineTo(x, y);
        break;
      case "h":
        c = commands[i];
        x += c[1];
        ctx.lineTo(x, y);
        break;
      case "V":
        c = commands[i];
        y = c[1];
        ctx.lineTo(x, y);
        break;
      case "v":
        c = commands[i];
        y += c[1];
        ctx.lineTo(x, y);
        break;
      case "a":
      case "A":
        c = commands[i];
        if (currentPoint === null) {
          throw new Error("This should never happen");
        }
        if (pathType === "a") {
          x += c[6];
          y += c[7];
        } else {
          x = c[6];
          y = c[7];
        }
        rx = c[1];
        ry = c[2];
        angle = c[3] * Math.PI / 180;
        largeArcFlag = !!c[4];
        sweepFlag = !!c[5];
        endPoint = { x, y };
        midPoint = {
          x: (currentPoint.x - endPoint.x) / 2,
          y: (currentPoint.y - endPoint.y) / 2
        };
        rotatePoint(midPoint, -angle);
        lambda = midPoint.x * midPoint.x / (rx * rx) + midPoint.y * midPoint.y / (ry * ry);
        if (lambda > 1) {
          lambda = Math.sqrt(lambda);
          rx *= lambda;
          ry *= lambda;
        }
        centerPoint = {
          x: rx * midPoint.y / ry,
          y: -(ry * midPoint.x) / rx
        };
        t1 = rx * rx * ry * ry;
        t2 = rx * rx * midPoint.y * midPoint.y + ry * ry * midPoint.x * midPoint.x;
        if (sweepFlag !== largeArcFlag) {
          scalePoint(centerPoint, Math.sqrt((t1 - t2) / t2) || 0);
        } else {
          scalePoint(centerPoint, -Math.sqrt((t1 - t2) / t2) || 0);
        }
        startAngle = Math.atan2((midPoint.y - centerPoint.y) / ry, (midPoint.x - centerPoint.x) / rx);
        endAngle = Math.atan2(-(midPoint.y + centerPoint.y) / ry, -(midPoint.x + centerPoint.x) / rx);
        rotatePoint(centerPoint, angle);
        translatePoint(centerPoint, (endPoint.x + currentPoint.x) / 2, (endPoint.y + currentPoint.y) / 2);
        ctx.save();
        ctx.translate(centerPoint.x, centerPoint.y);
        ctx.rotate(angle);
        ctx.scale(rx, ry);
        ctx.arc(0, 0, 1, startAngle, endAngle, !sweepFlag);
        ctx.restore();
        break;
      case "C":
        c = commands[i];
        cpx = c[3];
        cpy = c[4];
        x = c[5];
        y = c[6];
        ctx.bezierCurveTo(c[1], c[2], cpx, cpy, x, y);
        break;
      case "c":
        c = commands[i];
        ctx.bezierCurveTo(c[1] + x, c[2] + y, c[3] + x, c[4] + y, c[5] + x, c[6] + y);
        cpx = c[3] + x;
        cpy = c[4] + y;
        x += c[5];
        y += c[6];
        break;
      case "S":
        c = commands[i];
        if (cpx === null || cpy === null) {
          cpx = x;
          cpy = y;
        }
        ctx.bezierCurveTo(2 * x - cpx, 2 * y - cpy, c[1], c[2], c[3], c[4]);
        cpx = c[1];
        cpy = c[2];
        x = c[3];
        y = c[4];
        break;
      case "s":
        c = commands[i];
        if (cpx === null || cpy === null) {
          cpx = x;
          cpy = y;
        }
        ctx.bezierCurveTo(2 * x - cpx, 2 * y - cpy, c[1] + x, c[2] + y, c[3] + x, c[4] + y);
        cpx = c[1] + x;
        cpy = c[2] + y;
        x += c[3];
        y += c[4];
        break;
      case "Q":
        c = commands[i];
        qcpx = c[1];
        qcpy = c[2];
        x = c[3];
        y = c[4];
        ctx.quadraticCurveTo(qcpx, qcpy, x, y);
        break;
      case "q":
        c = commands[i];
        qcpx = c[1] + x;
        qcpy = c[2] + y;
        x += c[3];
        y += c[4];
        ctx.quadraticCurveTo(qcpx, qcpy, x, y);
        break;
      case "T":
        c = commands[i];
        if (qcpx === null || qcpy === null) {
          qcpx = x;
          qcpy = y;
        }
        qcpx = 2 * x - qcpx;
        qcpy = 2 * y - qcpy;
        x = c[1];
        y = c[2];
        ctx.quadraticCurveTo(qcpx, qcpy, x, y);
        break;
      case "t":
        c = commands[i];
        if (qcpx === null || qcpy === null) {
          qcpx = x;
          qcpy = y;
        }
        qcpx = 2 * x - qcpx;
        qcpy = 2 * y - qcpy;
        x += c[1];
        y += c[2];
        ctx.quadraticCurveTo(qcpx, qcpy, x, y);
        break;
      case "z":
      case "Z":
        if (startPoint) {
          x = startPoint.x;
          y = startPoint.y;
        }
        startPoint = null;
        ctx.closePath();
        break;
      case "AC":
        c = commands[i];
        x = c[1];
        y = c[2];
        r = c[3];
        startAngle = c[4];
        endAngle = c[5];
        ccw = c[6];
        ctx.arc(x, y, r, startAngle, endAngle, ccw);
        break;
      case "AT":
        c = commands[i];
        x1 = c[1];
        y1 = c[2];
        x = c[3];
        y = c[4];
        r = c[5];
        ctx.arcTo(x1, y1, x, y, r);
        break;
      case "E":
        c = commands[i];
        x = c[1];
        y = c[2];
        rx = c[3];
        ry = c[4];
        angle = c[5];
        startAngle = c[6];
        endAngle = c[7];
        ccw = c[8];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.scale(rx, ry);
        ctx.arc(0, 0, 1, startAngle, endAngle, ccw);
        ctx.restore();
        break;
      case "R":
        c = commands[i];
        x = c[1];
        y = c[2];
        w = c[3];
        h = c[4];
        startPoint = { x, y };
        ctx.rect(x, y, w, h);
        break;
      case "RR":
        c = commands[i];
        x = c[1];
        y = c[2];
        w = c[3];
        h = c[4];
        radii = c[5];
        startPoint = { x, y };
        ctx.roundRect(x, y, w, h, radii);
        break;
      default:
        throw new Error(`Invalid path command: ${pathType}`);
    }
    if (!currentPoint) {
      currentPoint = { x, y };
    } else {
      currentPoint.x = x;
      currentPoint.y = y;
    }
  }
}
function roundRect(x, y, width, height, radii = 0) {
  if (typeof radii === "number") {
    radii = [radii];
  }
  if (Array.isArray(radii)) {
    if (radii.length === 0 || radii.length > 4) {
      throw new RangeError(
        `Failed to execute 'roundRect' on '${this.constructor.name}': ${radii.length} radii provided. Between one and four radii are necessary.`
      );
    }
    radii.forEach((v) => {
      if (v < 0) {
        throw new RangeError(
          `Failed to execute 'roundRect' on '${this.constructor.name}': Radius value ${v} is negative.`
        );
      }
    });
  } else {
    return;
  }
  if (radii.length === 1 && radii[0] === 0) {
    this.rect(x, y, width, height);
    return;
  }
  const minRadius = Math.min(width, height) / 2;
  const tl = Math.min(minRadius, radii[0]);
  let tr = tl;
  let br = tl;
  let bl = tl;
  if (radii.length === 2) {
    tr = Math.min(minRadius, radii[1]);
    bl = tr;
  }
  if (radii.length === 3) {
    tr = Math.min(minRadius, radii[1]);
    bl = tr;
    br = Math.min(minRadius, radii[2]);
  }
  if (radii.length === 4) {
    tr = Math.min(minRadius, radii[1]);
    br = Math.min(minRadius, radii[2]);
    bl = Math.min(minRadius, radii[3]);
  }
  this.moveTo(x, y + height - bl);
  this.arcTo(x, y, x + tl, y, tl);
  this.arcTo(x + width, y, x + width, y + tr, tr);
  this.arcTo(x + width, y + height, x + width - br, y + height, br);
  this.arcTo(x, y + height, x, y + height - bl, bl);
  this.closePath();
}
function applyPath2DToCanvasRenderingContext(CanvasRenderingContext2D) {
  if (!CanvasRenderingContext2D) return;
  const cClip = CanvasRenderingContext2D.prototype.clip;
  const cFill = CanvasRenderingContext2D.prototype.fill;
  const cStroke = CanvasRenderingContext2D.prototype.stroke;
  const cIsPointInPath = CanvasRenderingContext2D.prototype.isPointInPath;
  CanvasRenderingContext2D.prototype.clip = function clip(...args) {
    if (args[0] instanceof Path2D) {
      const path = args[0];
      const fillRule2 = args[1] || "nonzero";
      buildPath(this, path.commands);
      return cClip.apply(this, [fillRule2]);
    }
    const fillRule = args[0] || "nonzero";
    return cClip.apply(this, [fillRule]);
  };
  CanvasRenderingContext2D.prototype.fill = function fill(...args) {
    if (args[0] instanceof Path2D) {
      const path = args[0];
      const fillRule2 = args[1] || "nonzero";
      buildPath(this, path.commands);
      return cFill.apply(this, [fillRule2]);
    }
    const fillRule = args[0] || "nonzero";
    return cFill.apply(this, [fillRule]);
  };
  CanvasRenderingContext2D.prototype.stroke = function stroke(path) {
    if (path) {
      buildPath(this, path.commands);
    }
    cStroke.apply(this);
  };
  CanvasRenderingContext2D.prototype.isPointInPath = function isPointInPath(...args) {
    if (args[0] instanceof Path2D) {
      const path = args[0];
      const x = args[1];
      const y = args[2];
      const fillRule = args[3] || "nonzero";
      buildPath(this, path.commands);
      return cIsPointInPath.apply(this, [x, y, fillRule]);
    }
    return cIsPointInPath.apply(this, args);
  };
}
function applyRoundRectToCanvasRenderingContext2D(CanvasRenderingContext2D) {
  if (CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = roundRect;
  }
}
function applyRoundRectToPath2D(P2D) {
  if (P2D && !P2D.prototype.roundRect) {
    P2D.prototype.roundRect = roundRect;
  }
}
exports.Path2D = Path2D;
exports.applyPath2DToCanvasRenderingContext = applyPath2DToCanvasRenderingContext;
exports.applyRoundRectToCanvasRenderingContext2D = applyRoundRectToCanvasRenderingContext2D;
exports.applyRoundRectToPath2D = applyRoundRectToPath2D;
exports.buildPath = buildPath;
exports.parsePath = parsePath;
exports.roundRect = roundRect;
