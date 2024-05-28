let e, t, i, n, r, a, o, s, l;
function d(e, t, i, n) {
    Object.defineProperty(e, t, {
        get: i,
        set: n,
        enumerable: !0,
        configurable: !0
    })
}
var c = globalThis
  , p = {}
  , h = {}
  , u = c.parcelRequire4485;
null == u && ((u = function(e) {
    if (e in p)
        return p[e].exports;
    if (e in h) {
        var t = h[e];
        delete h[e];
        var i = {
            id: e,
            exports: {}
        };
        return p[e] = i,
        t.call(i.exports, i, i.exports),
        i.exports
    }
    var n = Error("Cannot find module '" + e + "'");
    throw n.code = "MODULE_NOT_FOUND",
    n
}
).register = function(e, t) {
    h[e] = t
}
,
c.parcelRequire4485 = u);
var m = u.register;
m("hBOJ2", function(e, t) {
    d(e.exports, "default", ()=>i);
    var i = function() {
        var e = 0
          , t = document.createElement("div");
        function n(e) {
            return t.appendChild(e.dom),
            e
        }
        function r(i) {
            for (var n = 0; n < t.children.length; n++)
                t.children[n].style.display = n === i ? "block" : "none";
            e = i
        }
        t.style.cssText = "position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000",
        t.addEventListener("click", function(i) {
            i.preventDefault(),
            r(++e % t.children.length)
        }, !1);
        var a = (performance || Date).now()
          , o = a
          , s = 0
          , l = n(new i.Panel("FPS","#0ff","#002"))
          , d = n(new i.Panel("MS","#0f0","#020"));
        if (self.performance && self.performance.memory)
            var c = n(new i.Panel("MB","#f08","#201"));
        return r(0),
        {
            REVISION: 16,
            dom: t,
            addPanel: n,
            showPanel: r,
            begin: function() {
                a = (performance || Date).now()
            },
            end: function() {
                s++;
                var e = (performance || Date).now();
                if (d.update(e - a, 200),
                e > o + 1e3 && (l.update(1e3 * s / (e - o), 100),
                o = e,
                s = 0,
                c)) {
                    var t = performance.memory;
                    c.update(t.usedJSHeapSize / 1048576, t.jsHeapSizeLimit / 1048576)
                }
                return e
            },
            update: function() {
                a = this.end()
            },
            domElement: t,
            setMode: r
        }
    };
    i.Panel = function(e, t, i) {
        var n = 1 / 0
          , r = 0
          , a = Math.round
          , o = a(window.devicePixelRatio || 1)
          , s = 80 * o
          , l = 48 * o
          , d = 3 * o
          , c = 2 * o
          , p = 3 * o
          , h = 15 * o
          , u = 74 * o
          , m = 30 * o
          , f = document.createElement("canvas");
        f.width = s,
        f.height = l,
        f.style.cssText = "width:80px;height:48px";
        var y = f.getContext("2d");
        return y.font = "bold " + 9 * o + "px Helvetica,Arial,sans-serif",
        y.textBaseline = "top",
        y.fillStyle = i,
        y.fillRect(0, 0, s, l),
        y.fillStyle = t,
        y.fillText(e, d, c),
        y.fillRect(p, h, u, m),
        y.fillStyle = i,
        y.globalAlpha = .9,
        y.fillRect(p, h, u, m),
        {
            dom: f,
            update: function(l, w) {
                n = Math.min(n, l),
                r = Math.max(r, l),
                y.fillStyle = i,
                y.globalAlpha = 1,
                y.fillRect(0, 0, s, h),
                y.fillStyle = t,
                y.fillText(a(l) + " " + e + " (" + a(n) + "-" + a(r) + ")", d, c),
                y.drawImage(f, p + o, h, u - o, m, p, h, u - o, m),
                y.fillRect(p + u - o, h, o, m),
                y.fillStyle = i,
                y.globalAlpha = .9,
                y.fillRect(p + u - o, h, o, a((1 - l / w) * m))
            }
        }
    }
}),
m("4h5hN", function(e, t) {
    d(e.exports, "acceleratedRaycast", ()=>p),
    d(e.exports, "computeBoundsTree", ()=>h),
    d(e.exports, "disposeBoundsTree", ()=>m);
    var i = u("ilwiq")
      , n = u("b4YKL")
      , r = u("ff8ed");
    let a = new i.Ray
      , o = new i.Vector3
      , s = new i.Matrix4
      , l = new i.Vector3
      , c = i.Mesh.prototype.raycast;
    function p(e, t) {
        if (this.geometry.boundsTree) {
            if (void 0 === this.material)
                return;
            s.copy(this.matrixWorld).invert(),
            a.copy(e.ray).applyMatrix4(s),
            this.getWorldScale(l),
            o.copy(a.direction).multiply(l);
            let i = o.length()
              , r = e.near / i
              , d = e.far / i
              , c = this.geometry.boundsTree;
            if (!0 === e.firstHitOnly) {
                let i = (0,
                n.convertRaycastIntersect)(c.raycastFirst(a, this.material, r, d), this, e);
                i && t.push(i)
            } else {
                let i = c.raycast(a, this.material, r, d);
                for (let r = 0, a = i.length; r < a; r++) {
                    let a = (0,
                    n.convertRaycastIntersect)(i[r], this, e);
                    a && t.push(a)
                }
            }
        } else
            c.call(this, e, t)
    }
    function h(e) {
        return this.boundsTree = new r.MeshBVH(this,e),
        this.boundsTree
    }
    function m() {
        this.boundsTree = null
    }
}),
m("b4YKL", function(e, t) {
    d(e.exports, "convertRaycastIntersect", ()=>i);
    function i(e, t, i) {
        return null === e ? null : (e.point.applyMatrix4(t.matrixWorld),
        e.distance = e.point.distanceTo(i.ray.origin),
        e.object = t,
        e)
    }
}),
m("5ca9G", function(e, t) {
    d(e.exports, "MeshBVHHelper", ()=>s);
    var i = u("ilwiq")
      , n = u("aw71y")
      , r = u("ff8ed");
    let a = new i.Box3;
    class o extends i.Object3D {
        get isMesh() {
            return !this.displayEdges
        }
        get isLineSegments() {
            return this.displayEdges
        }
        get isLine() {
            return this.displayEdges
        }
        constructor(e, t, n=10, r=0) {
            super(),
            this.material = t,
            this.geometry = new i.BufferGeometry,
            this.name = "MeshBVHRootHelper",
            this.depth = n,
            this.displayParents = !1,
            this.bvh = e,
            this.displayEdges = !0,
            this._group = r
        }
        raycast() {}
        update() {
            let e = this.geometry
              , t = this.bvh
              , r = this._group;
            if (e.dispose(),
            this.visible = !1,
            t) {
                let o, s;
                let l = this.depth - 1
                  , d = this.displayParents
                  , c = 0;
                t.traverse((e,t)=>{
                    if (e >= l || t)
                        return c++,
                        !0;
                    d && c++
                }
                , r);
                let p = 0
                  , h = new Float32Array(24 * c);
                t.traverse((e,t,i)=>{
                    let r = e >= l || t;
                    if (r || d) {
                        (0,
                        n.arrayToBox)(0, i, a);
                        let {min: e, max: t} = a;
                        for (let i = -1; i <= 1; i += 2) {
                            let n = i < 0 ? e.x : t.x;
                            for (let i = -1; i <= 1; i += 2) {
                                let r = i < 0 ? e.y : t.y;
                                for (let i = -1; i <= 1; i += 2) {
                                    let a = i < 0 ? e.z : t.z;
                                    h[p + 0] = n,
                                    h[p + 1] = r,
                                    h[p + 2] = a,
                                    p += 3
                                }
                            }
                        }
                        return r
                    }
                }
                , r),
                s = new Uint8Array(this.displayEdges ? [0, 4, 1, 5, 2, 6, 3, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 2, 1, 3, 4, 6, 5, 6, 7, 5, 1, 4, 5, 0, 4, 1, 2, 3, 6, 3, 7, 6, 0, 2, 4, 2, 6, 4, 1, 5, 3, 3, 5, 7]),
                o = h.length > 65535 ? new Uint32Array(s.length * c) : new Uint16Array(s.length * c);
                let u = s.length;
                for (let e = 0; e < c; e++) {
                    let t = 8 * e
                      , i = e * u;
                    for (let e = 0; e < u; e++)
                        o[i + e] = t + s[e]
                }
                e.setIndex(new i.BufferAttribute(o,1,!1)),
                e.setAttribute("position", new i.BufferAttribute(h,3,!1)),
                this.visible = !0
            }
        }
    }
    class s extends i.Group {
        get color() {
            return this.edgeMaterial.color
        }
        get opacity() {
            return this.edgeMaterial.opacity
        }
        set opacity(e) {
            this.edgeMaterial.opacity = e,
            this.meshMaterial.opacity = e
        }
        constructor(e=null, t=null, n=10) {
            e instanceof r.MeshBVH && (n = t || 10,
            t = e,
            e = null),
            "number" == typeof t && (n = t,
            t = null),
            super(),
            this.name = "MeshBVHHelper",
            this.depth = n,
            this.mesh = e,
            this.bvh = t,
            this.displayParents = !1,
            this.displayEdges = !0,
            this._roots = [];
            let a = new i.LineBasicMaterial({
                color: 65416,
                transparent: !0,
                opacity: .3,
                depthWrite: !1
            })
              , o = new i.MeshBasicMaterial({
                color: 65416,
                transparent: !0,
                opacity: .3,
                depthWrite: !1
            });
            o.color = a.color,
            this.edgeMaterial = a,
            this.meshMaterial = o,
            this.update()
        }
        update() {
            let e = this.bvh || this.mesh.geometry.boundsTree
              , t = e ? e._roots.length : 0;
            for (; this._roots.length > t; ) {
                let e = this._roots.pop();
                e.geometry.dispose(),
                this.remove(e)
            }
            for (let i = 0; i < t; i++) {
                let {depth: t, edgeMaterial: n, meshMaterial: r, displayParents: a, displayEdges: s} = this;
                if (i >= this._roots.length) {
                    let r = new o(e,n,t,i);
                    this.add(r),
                    this._roots.push(r)
                }
                let l = this._roots[i];
                l.bvh = e,
                l.depth = t,
                l.displayParents = a,
                l.displayEdges = s,
                l.material = s ? n : r,
                l.update()
            }
        }
        updateMatrixWorld(...e) {
            let t = this.mesh
              , i = this.parent;
            null !== t && (t.updateWorldMatrix(!0, !1),
            i ? this.matrix.copy(i.matrixWorld).invert().multiply(t.matrixWorld) : this.matrix.copy(t.matrixWorld),
            this.matrix.decompose(this.position, this.quaternion, this.scale)),
            super.updateMatrixWorld(...e)
        }
        copy(e) {
            this.depth = e.depth,
            this.mesh = e.mesh,
            this.bvh = e.bvh,
            this.opacity = e.opacity,
            this.color.copy(e.color)
        }
        clone() {
            return new s(this.mesh,this.bvh,this.depth)
        }
        dispose() {
            this.edgeMaterial.dispose(),
            this.meshMaterial.dispose();
            let e = this.children;
            for (let t = 0, i = e.length; t < i; t++)
                e[t].geometry.dispose()
        }
    }
});
var f = u("hBOJ2")
  , y = u("jiuw3")
  , w = u("ilwiq")
  , g = u("5Rd1x")
  , x = u("7ePFa")
  , b = u("4h5hN")
  , v = u("Mleu6")
  , M = u("5ca9G");
w.Mesh.prototype.raycast = b.acceleratedRaycast,
w.BufferGeometry.prototype.computeBoundsTree = b.computeBoundsTree,
w.BufferGeometry.prototype.disposeBoundsTree = b.disposeBoundsTree;
let B = new w.Vector3(0,0,1), E = !1, S = new w.Vector2, T = new w.Vector2, P = !1, C = !1, R = new w.Vector3, z, V = !1;
const A = {
    matcap: "Clay",
    size: .1,
    brush: "clay",
    intensity: 50,
    maxSteps: 10,
    invert: !1,
    symmetrical: !0,
    flatShading: !1,
    depth: 10,
    displayHelper: !1
}
  , H = {};
function L() {
    a && (a.geometry.dispose(),
    a.material.dispose(),
    t.remove(a));
    let e = new w.IcosahedronBufferGeometry(1,100);
    e.deleteAttribute("uv"),
    (e = x.mergeVertices(e)).attributes.position.setUsage(w.DynamicDrawUsage),
    e.attributes.normal.setUsage(w.DynamicDrawUsage),
    e.computeBoundsTree({
        setBoundingBox: !1
    }),
    (a = new w.Mesh(e,z)).frustumCulled = !1,
    t.add(a),
    !l && (l = new M.MeshBVHHelper(a,A.depth),
    A.displayHelper && t.add(l)),
    l.mesh = a,
    l.update()
}
function _(e, t, i=!1, n={}) {
    let {accumulatedTriangles: r=new Set, accumulatedIndices: o=new Set, accumulatedTraversedNodeIndices: s=new Set} = n
      , l = new w.Matrix4;
    l.copy(a.matrixWorld).invert();
    let d = new w.Sphere;
    d.center.copy(e).applyMatrix4(l),
    d.radius = A.size;
    let c = new Set
      , p = new w.Vector3
      , h = new w.Vector3
      , u = a.geometry.index
      , m = a.geometry.attributes.position
      , f = a.geometry.attributes.normal
      , y = new Set;
    a.geometry.boundsTree.shapecast({
        intersectsBounds: (e,t,i,n,r)=>{
            s.add(r);
            let a = d.intersectsBox(e)
              , {min: o, max: l} = e;
            if (a) {
                for (let e = 0; e <= 1; e++)
                    for (let t = 0; t <= 1; t++)
                        for (let i = 0; i <= 1; i++)
                            if (p.set(0 === e ? o.x : l.x, 0 === t ? o.y : l.y, 0 === i ? o.z : l.z),
                            !d.containsPoint(p))
                                return v.INTERSECTED;
                return v.CONTAINED
            }
            return a ? v.INTERSECTED : v.NOT_INTERSECTED
        }
        ,
        intersectsTriangle: (e,t,i)=>{
            y.add(t),
            r.add(t);
            let n = 3 * t
              , a = u.getX(n + 0)
              , s = u.getX(n + 1)
              , l = u.getX(n + 2);
            return i ? (c.add(a),
            c.add(s),
            c.add(l),
            o.add(a),
            o.add(s),
            o.add(l)) : (d.containsPoint(e.a) && (c.add(a),
            o.add(a)),
            d.containsPoint(e.b) && (c.add(s),
            o.add(s)),
            d.containsPoint(e.c) && (c.add(l),
            o.add(l))),
            !1
        }
    });
    let g = new w.Vector3;
    g.copy(e).applyMatrix4(l);
    let x = new w.Vector3
      , b = 0;
    if (c.forEach(e=>{
        p.fromBufferAttribute(f, e),
        h.add(p),
        i || (b++,
        p.fromBufferAttribute(m, e),
        x.add(p))
    }
    ),
    h.normalize(),
    t.quaternion.setFromUnitVectors(B, h),
    b && x.multiplyScalar(1 / b),
    i)
        return;
    let M = 1e-4 * A.intensity
      , E = new w.Plane;
    E.setFromNormalAndCoplanarPoint(h, x),
    c.forEach(e=>{
        p.fromBufferAttribute(m, e);
        let t = p.distanceTo(g)
          , i = A.invert !== V ? -1 : 1
          , n = 1 - t / A.size;
        if ("clay" === A.brush) {
            n = Math.pow(n, 3);
            let e = E.distanceToPoint(p)
              , t = i * Math.min(4 * n, 1);
            p.addScaledVector(h, t * M - i * e * t * .3)
        } else if ("normal" === A.brush)
            n = Math.pow(n, 2),
            p.addScaledVector(h, i * n * M);
        else if ("flatten" === A.brush) {
            n = Math.pow(n, 2);
            let e = E.distanceToPoint(p);
            p.addScaledVector(h, -e * n * A.intensity * .005)
        }
        m.setXYZ(e, p.x, p.y, p.z),
        f.setXYZ(e, 0, 0, 0)
    }
    ),
    c.size && (m.needsUpdate = !0)
}
(function() {
    (n = new w.WebGLRenderer({
        antialias: !0
    })).setPixelRatio(window.devicePixelRatio),
    n.setSize(window.innerWidth, window.innerHeight),
    n.setClearColor(394761, 1),
    n.outputEncoding = w.sRGBEncoding,
    document.body.appendChild(n.domElement),
    n.domElement.style.touchAction = "none",
    (t = new w.Scene).fog = new w.Fog(1251612,20,60);
    let d = new w.DirectionalLight(16777215,.5);
    d.position.set(1, 1, 1),
    t.add(d),
    t.add(new w.AmbientLight(16777215,.4));
    let c = [new w.Vector3, new w.Vector3(0,0,1)];
    for (let e = 0; e < 50; e++) {
        let t = e + 1
          , i = Math.sin(2 * Math.PI * e / 50)
          , n = Math.cos(2 * Math.PI * e / 50)
          , r = Math.sin(2 * Math.PI * t / 50)
          , a = Math.cos(2 * Math.PI * t / 50);
        c.push(new w.Vector3(i,n,0), new w.Vector3(r,a,0))
    }
    for (let n in (o = new w.LineSegments).geometry.setFromPoints(c),
    o.material.color.set(16485376),
    t.add(o),
    s = o.clone(),
    t.add(s),
    (i = new w.PerspectiveCamera(75,window.innerWidth / window.innerHeight,.1,50)).position.set(0, 0, 3),
    i.far = 100,
    i.updateProjectionMatrix(),
    e = new f.default,
    document.body.appendChild(e.dom),
    H.Clay = new w.TextureLoader().load("../textures/B67F6B_4B2E2A_6C3A34_F3DBC6-256px.png"),
    H["Red Wax"] = new w.TextureLoader().load("../textures/763C39_431510_210504_55241C-256px.png"),
    H["Shiny Green"] = new w.TextureLoader().load("../textures/3B6E10_E3F2C3_88AC2E_99CE51-256px.png"),
    H.Normal = new w.TextureLoader().load("../textures/7877EE_D87FC5_75D9C7_1C78C0-256px.png"),
    z = new w.MeshMatcapMaterial({
        flatShading: A.flatShading
    }),
    H)
        H[n].encoding = w.sRGBEncoding;
    L();
    let p = new y.GUI;
    p.add(A, "matcap", Object.keys(H));
    let h = p.addFolder("Sculpting");
    h.add(A, "brush", ["normal", "clay", "flatten"]),
    h.add(A, "size").min(.025).max(.25).step(.005),
    h.add(A, "intensity").min(1).max(100).step(1),
    h.add(A, "maxSteps").min(1).max(25).step(1),
    h.add(A, "symmetrical"),
    h.add(A, "invert"),
    h.add(A, "flatShading").onChange(e=>{
        a.material.flatShading = e,
        a.material.needsUpdate = !0
    }
    ),
    h.open();
    let u = p.addFolder("BVH Helper");
    u.add(A, "depth").min(1).max(20).step(1).onChange(e=>{
        l.depth = parseFloat(e),
        l.update()
    }
    ),
    u.add(A, "displayHelper").onChange(e=>{
        e ? (t.add(l),
        l.update()) : t.remove(l)
    }
    ),
    u.open(),
    p.add({
        reset: L
    }, "reset"),
    p.add({
        rebuildBVH: ()=>{
            a.geometry.computeBoundsTree({
                setBoundingBox: !1
            }),
            l.update()
        }
    }, "rebuildBVH"),
    p.open(),
    window.addEventListener("resize", function() {
        i.aspect = window.innerWidth / window.innerHeight,
        i.updateProjectionMatrix(),
        n.setSize(window.innerWidth, window.innerHeight)
    }, !1),
    window.addEventListener("pointermove", function(e) {
        S.x = e.clientX / window.innerWidth * 2 - 1,
        S.y = -(e.clientY / window.innerHeight * 2) + 1,
        E = !0
    }),
    window.addEventListener("pointerdown", e=>{
        S.x = e.clientX / window.innerWidth * 2 - 1,
        S.y = -(e.clientY / window.innerHeight * 2) + 1,
        P = !!(3 & e.buttons),
        V = !!(2 & e.buttons),
        E = !0;
        let t = new w.Raycaster;
        t.setFromCamera(S, i),
        t.firstHitOnly = !0;
        let n = t.intersectObject(a);
        r.enabled = 0 === n.length
    }
    , !0),
    window.addEventListener("pointerup", e=>{
        P = !!(3 & e.buttons),
        "touch" === e.pointerType && (E = !1)
    }
    ),
    window.addEventListener("contextmenu", function(e) {
        e.preventDefault()
    }),
    window.addEventListener("wheel", function(e) {
        let t = e.deltaY;
        1 === e.deltaMode && (t *= 40),
        2 === e.deltaMode && (t *= 40),
        A.size += 1e-4 * t,
        A.size = Math.max(Math.min(A.size, .25), .025),
        p.controllersRecursive().forEach(e=>e.updateDisplay())
    }),
    (r = new g.OrbitControls(i,n.domElement)).minDistance = 1.5,
    r.addEventListener("start", function() {
        this.active = !0
    }),
    r.addEventListener("end", function() {
        this.active = !1
    })
}
)(),
function d() {
    if (requestAnimationFrame(d),
    e.begin(),
    z.matcap = H[A.matcap],
    r.active || !E)
        o.visible = !1,
        s.visible = !1,
        R.setScalar(1 / 0);
    else {
        let e = new w.Raycaster;
        e.setFromCamera(S, i),
        e.firstHitOnly = !0;
        let t = e.intersectObject(a, !0)[0];
        if (t) {
            if (o.visible = !0,
            o.scale.set(A.size, A.size, .1),
            o.position.copy(t.point),
            s.visible = A.symmetrical,
            s.scale.set(A.size, A.size, .1),
            s.position.copy(t.point),
            s.position.x *= -1,
            r.enabled = !1,
            R.x === 1 / 0 && R.copy(t.point),
            P || C) {
                let e = (S.x - T.x) * window.innerWidth * window.devicePixelRatio
                  , i = (S.y - T.y) * window.innerHeight * window.devicePixelRatio
                  , n = Math.sqrt(e * e + i * i)
                  , r = t.point.distanceTo(R)
                  , d = .15 * A.size
                  , c = Math.max(d / r, 1 / A.maxSteps)
                  , p = n * c
                  , h = 0
                  , u = new Set
                  , m = new Set
                  , f = new Set
                  , y = {
                    accumulatedTriangles: u,
                    accumulatedIndices: m,
                    accumulatedTraversedNodeIndices: f
                };
                for (; r > d && n > 200 * A.size / t.distance && (T.lerp(S, c),
                R.lerp(t.point, c),
                r -= d,
                n -= p,
                _(R, o, !1, y),
                A.symmetrical && (R.x *= -1,
                _(R, s, !1, y),
                R.x *= -1),
                !(++h > A.maxSteps)); )
                    ;
                h > 0 ? (function(e, t) {
                    let i = new w.Vector3
                      , n = new w.Vector3
                      , r = a.geometry.index
                      , o = a.geometry.attributes.position
                      , s = a.geometry.attributes.normal
                      , l = new w.Triangle;
                    e.forEach(e=>{
                        let a = 3 * e
                          , d = r.getX(a + 0)
                          , c = r.getX(a + 1)
                          , p = r.getX(a + 2);
                        l.a.fromBufferAttribute(o, d),
                        l.b.fromBufferAttribute(o, c),
                        l.c.fromBufferAttribute(o, p),
                        l.getNormal(n),
                        t.has(d) && (i.fromBufferAttribute(s, d),
                        i.add(n),
                        s.setXYZ(d, i.x, i.y, i.z)),
                        t.has(c) && (i.fromBufferAttribute(s, c),
                        i.add(n),
                        s.setXYZ(c, i.x, i.y, i.z)),
                        t.has(p) && (i.fromBufferAttribute(s, p),
                        i.add(n),
                        s.setXYZ(p, i.x, i.y, i.z))
                    }
                    ),
                    t.forEach(e=>{
                        i.fromBufferAttribute(s, e),
                        i.normalize(),
                        s.setXYZ(e, i.x, i.y, i.z)
                    }
                    ),
                    s.needsUpdate = !0
                }(u, m),
                a.geometry.boundsTree.refit(f),
                null !== l.parent && l.update()) : (_(t.point, o, !0),
                A.symmetrical && (t.point.x *= -1,
                _(t.point, s, !0),
                t.point.x *= -1))
            } else
                _(t.point, o, !0),
                A.symmetrical && (t.point.x *= -1,
                _(t.point, s, !0),
                t.point.x *= -1),
                T.copy(S),
                R.copy(t.point)
        } else
            r.enabled = !0,
            o.visible = !1,
            s.visible = !1,
            T.copy(S),
            R.setScalar(1 / 0)
    }
    C = P,
    n.render(t, i),
    e.end()
}();
//# sourceMappingURL=sculpt.929b05f9.js.map
