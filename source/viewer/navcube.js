OV.NavCubeParams =  
{
    // tween: boolean = false; TODO
    // showHome: boolean = false; TODO
    // highLight: boolean = false; TODO
    champer   : 0.15, // percentage
    faceColor   :   0xd6d7dc,
    edgeColor   :   0xb1c5d4,
    vertexColor :   0x71879a,
    hoverColor  :   0xc9e5f8,
};

// That's the closest to an enum in ES6
Side = class 
{
    static get Front()  { return 1; }
    static get Back()   { return 2; } 
    static get Left()   { return 4; }
    static get Right()  { return 8; }
    static get Top()    { return 16; }
    static get Bottom() { return 32; }
};

OV.NavCubeInteraction = class 
{
    constructor()
    {
        this.activePlane = 0;
        this.oldPosition = new THREE.Vector3();
        this.newPosition = new THREE.Vector3();
        this.moving      = false;
    }
}

OV.NavCube = class
{
    constructor(params, viewer, canvas) 
    {
        this.params = Object.assign(OV.NavCubeParams, params);
        //
        this.params.hoverColor = new THREE.Color(this.params.hoverColor);
        this.cubeMesh = new THREE.Mesh();
        this.canvas = canvas;
        this.canvas.id = 'navcube';
        this.renderer = new THREE.WebGLRenderer ({ canvas : this.canvas, antialias : true, alpha: true });
        if (window.devicePixelRatio) {
            this.renderer.setPixelRatio (window.devicePixelRatio);
        }
        this.renderer.setSize (this.canvas.width, this.canvas.height);
        
        this.scene = new THREE.Scene ();
        this.scene.background = null;
        this.initCamera();
        
        this.viewer = viewer;

        this.planes = [];
        this.createMainFacets();
        this.createEdgeFacets();
        this.createCornerFacets();
        this.createLabels();

        this.scene.add(this.cubeMesh);
        this.Render();

        this.addEvents();
    }

    addEvents()
    {
        this.interaction = new OV.NavCubeInteraction();

	    this.renderer.domElement.onmousemove = function(evt) {

            if (this.interaction.activePlane) {
                this.interaction.activePlane.material.color = this.interaction.activePlane.material.initialColor;
                this.interaction.activePlane.material.needsUpdate = true;
                this.interaction.activePlane = null;
            }

            let clientCoord = OV.GetClientCoordinates(this.renderer.domElement, evt.clientX, evt.clientY);
            let size = this.renderer.getSize(new THREE.Vector2());
            let mouse = new THREE.Vector2(clientCoord.x / size.width * 2 - 1, -clientCoord.y / size.height * 2 + 1);
            
            let raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.camera);
            let intersects = raycaster.intersectObjects(this.planes, true);

            if (intersects.length > 0) 
            {
                this.interaction.activePlane = intersects[0].object;
                if (this.interaction.activePlane.material.color != new THREE.Color(this.params.hoverColor)) 
                    this.interaction.activePlane.material.initialColor = this.interaction.activePlane.material.color;
                this.interaction.activePlane.material.color = new THREE.Color(this.params.hoverColor);
                this.interaction.activePlane.material.needsUpdate = true;
                this.interaction.activeFaceNormal = intersects[0].face.normal.clone();

                this.Render ();
            }
        }.bind(this);

	
	
        this.renderer.domElement.onclick = function(evt) {
            this.renderer.domElement.onmousemove(evt);
    
            if (!this.interaction.activePlane || this.interaction.moving) {
                return false;
            }

            let normal = this.interaction.activeFaceNormal;
            this.onSideClicked(normal);
    /*
            this.interaction.oldPosition.copy(this.camera.position);
    
            let navigationCamera = this.viewer.navigation.GetCamera ();
            let target = new THREE.Vector3(navigationCamera.center.x, navigationCamera.center.y, navigationCamera.center.z);
            let distance = this.camera.position.clone().sub(target).length();
            this.interaction.newPosition.copy(target);
    
            if (this.interaction.activePlane.position.x !== 0) {
                this.interaction.newPosition.x += this.interaction.activePlane.position.x < 0 ? -distance : distance;
            } else if (this.interaction.activePlane.position.y !== 0) {
                this.interaction.newPosition.y += this.interaction.activePlane.position.y < 0 ? -distance : distance;
            } else if (this.interaction.activePlane.position.z !== 0) {
                this.interaction.newPosition.z += this.interaction.activePlane.position.z < 0 ? -distance : distance;
            }
    
            //play = true;
            //startTime = Date.now();
            this.camera.position.copy(this.interaction.newPosition);
            */
        }.bind(this);
    
        this.renderer.domElement.ontouchmove = function(e) {
            let rect = e.target.getBoundingClientRect();
            let x = e.targetTouches[0].pageX - rect.left;
            let y = e.targetTouches[0].pageY - rect.top;
            this.renderer.domElement.onmousemove({
                offsetX: x,
                offsetY: y
            });
        }.bind(this);
    
        this.renderer.domElement.ontouchstart = function(e) {
            let rect = e.target.getBoundingClientRect();
            let x = e.targetTouches[0].pageX - rect.left;
            let y = e.targetTouches[0].pageY - rect.top;
            this.renderer.domElement.onclick({
                offsetX: x,
                offsetY: y
            });
        }.bind(this);
    }

    getMainCamera()
    {
        let camera = this.viewer.navigation.GetCamera ();
        let center = new THREE.Vector3(camera.center.x, camera.center.y, camera.center.z);
        let position = this.viewer.camera.position;
        return { camera: camera, center: center, position: position };
    }

    onSideClicked(normal) 
    {
        let upVector = null;
        // Avoid gimbal lock issue when going to top so that the up vector is right where we want it
        if (this.interaction.activePlane.userData.sides & Side.Top) {
            upVector = new OV.Coord3D(0, 1, 0);
        }
        else if (this.interaction.activePlane.userData.sides & Side.Bottom) {
            upVector = new OV.Coord3D(0, -1, 0);
        }
        else upVector = new OV.Coord3D(0, 0, 1);
        this.viewer.SetCameraViewDirection(new OV.Coord3D(-normal.x, -normal.y, -normal.z), true, upVector);
    }
    
    initCamera ()
    {
        this.camera = new THREE.PerspectiveCamera (45.0, this.canvas.width / this.canvas.height, 0.1, 1000.0);
    }

    ResizedRenderer (width, height)
    {
        if (window.devicePixelRatio) {
            this.renderer.setPixelRatio (window.devicePixelRatio);
        }
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix ();
        this.renderer.setSize (width, height);
        this.Render ();
    }

    Render ()
    {
        let cam = this.getMainCamera();
        this.camera.rotation.copy(this.viewer.camera.rotation);
		let dir = cam.position.clone().sub(cam.center).normalize();
		this.camera.position.copy(dir.multiplyScalar(2.5));
        this.renderer.render(this.scene, this.camera);
    }

    createMainFacets() 
    {
        // The projection of the 45° champer on the plane is champer / sqrt(2)
        let width = 1.0 - Math.sqrt(2) * this.params.champer;
        let plane = new THREE.PlaneGeometry(width, width).translate(0, 0, 0.5);
        let halfPi = Math.PI / 2;
        let geoms = [];
    
        geoms[Side.Front]  = plane.clone().rotateX(halfPi);
        geoms[Side.Back]   = plane.clone().rotateX(-halfPi).rotateY(Math.PI);
        geoms[Side.Left]   = plane.clone().rotateY(-halfPi).rotateX(halfPi);
        geoms[Side.Right]  = plane.clone().rotateY(halfPi).rotateX(halfPi);
        geoms[Side.Top]    = plane.clone();
        geoms[Side.Bottom] = plane.clone().rotateX(-Math.PI);
    
        geoms.forEach((geom, i) => {
          let mesh = new THREE.Mesh(geom, new THREE.MeshBasicMaterial());
          mesh.userData.sides = i;
          this.cubeMesh.add(mesh);
          this.planes.push(mesh);
        });
    }
    
    createEdgeFacets() 
    {
        let width = this.params.champer;
        let height = 1.0 - Math.sqrt(2) * this.params.champer;
        let plane = new THREE.PlaneGeometry(width, height);
        let mat = new THREE.MeshBasicMaterial({
          color: this.params.edgeColor,
        });
        let piBy2 = Math.PI / 2;
        let piBy4 = Math.PI / 4;
        let geoms = [];
        let offset = Math.sqrt(2) / 2 - this.params.champer / 2;
        plane.translate(0, 0, offset);
    
        // Side edges
        geoms[Side.Front | Side.Right] = plane.clone().rotateX(piBy2).rotateZ(piBy4);
        geoms[Side.Right | Side.Back]  = geoms[Side.Front | Side.Right].clone().rotateZ(piBy2);
        geoms[Side.Back  | Side.Left]  = geoms[Side.Right | Side.Back].clone().rotateZ(piBy2);
        geoms[Side.Left  | Side.Front] = geoms[Side.Back  | Side.Left].clone().rotateZ(piBy2);
    
        // Top edges
        geoms[Side.Top | Side.Right] = plane.clone().rotateY(piBy4);
        geoms[Side.Top | Side.Back]  = geoms[Side.Top | Side.Right].clone().rotateZ(piBy2);
        geoms[Side.Top | Side.Left]  = geoms[Side.Top | Side.Back].clone().rotateZ(piBy2);
        geoms[Side.Top | Side.Front] = geoms[Side.Top | Side.Left].clone().rotateZ(piBy2);
    
        // Bottom edges
        geoms[Side.Bottom | Side.Right] = plane.clone().rotateY(piBy4 + piBy2);
        geoms[Side.Bottom | Side.Back]  = geoms[Side.Bottom | Side.Right].clone().rotateZ(piBy2);
        geoms[Side.Bottom | Side.Left]  = geoms[Side.Bottom | Side.Back].clone().rotateZ(piBy2);
        geoms[Side.Bottom | Side.Front] = geoms[Side.Bottom | Side.Left].clone().rotateZ(piBy2);
    
        let localVertex = new THREE.Vector3();
        geoms.forEach((geom, i) => {
          let sideMat = mat.clone();
          let mesh = new THREE.Mesh(geom, sideMat);
          mesh.userData.sides = i;
          this.cubeMesh.add(mesh);
          this.planes.push(mesh.clone());
    
          // create wireframe
          let posAttr = geom.getAttribute('position');
          let points = [];

          points.push(localVertex.fromBufferAttribute(posAttr, 0).clone());
          points.push(localVertex.fromBufferAttribute(posAttr, 1).clone());
          points.push(localVertex.fromBufferAttribute(posAttr, 3).clone());
          points.push(localVertex.fromBufferAttribute(posAttr, 2).clone());
          points.push(localVertex.fromBufferAttribute(posAttr, 0).clone());
    
          const lineMat = new THREE.LineBasicMaterial({ color: 'black' }); // TODO make param
          var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMat);
          mesh.add(line); // the hierarchy is important for ray casting
        });
    }


    getClosestVertex(mesh, vec) 
    {
        // Basic O(N^2) search here
        let localVertex = new THREE.Vector3();
        let positions = mesh.geometry.getAttribute('position');
        let closest = localVertex.fromBufferAttribute(positions, 0).clone();
        let bestDist = closest.distanceTo(vec);
        for (let i = 1; i < positions.count; i++) {
            let vertex = localVertex.fromBufferAttribute(positions, i);
            let dist = vertex.distanceTo(vec);
            if (dist < bestDist) {
                bestDist = dist;
                closest = localVertex.fromBufferAttribute(positions, i).clone();
            }
        }
        return closest;
    }

    getMeshOfSide(side)
    {
        return this.cubeMesh.children.find((m) => m.userData.sides == side);
    }

    getTriangleOfSides(a, b, c, corner)
    {
        return new THREE.Triangle(this.getClosestVertex(this.getMeshOfSide(a), corner), this.getClosestVertex(this.getMeshOfSide(b), corner), this.getClosestVertex(this.getMeshOfSide(c), corner));
    }

    createCornerMesh(a, b, c, corner)
    {
        let geom = new THREE.BufferGeometry();
        let triangle = this.getTriangleOfSides(a, b, c, corner);
        let points = [];
        points.push(triangle.a);
        points.push(triangle.b);
        points.push(triangle.c);
        let mat = new THREE.MeshBasicMaterial({
          color: this.params.vertexColor,
        });
        geom.setFromPoints(points);
        geom.computeVertexNormals();
        let mesh = new THREE.Mesh(geom, mat);
        mesh.userData.sides = a | b | c;
        return mesh;
    }

    createCornerFacets() {
        let mesh = this.createCornerMesh(Side.Left,  Side.Front, Side.Top, new THREE.Vector3(-1, -1, 1));
        this.cubeMesh.add(mesh); this.planes.push(mesh);
        mesh = this.createCornerMesh(Side.Front, Side.Right, Side.Top, new THREE.Vector3(1, -1, 1));
        this.cubeMesh.add(mesh); this.planes.push(mesh);
        mesh = this.createCornerMesh(Side.Right, Side.Back,  Side.Top, new THREE.Vector3(1, 1, 1));
        this.cubeMesh.add(mesh); this.planes.push(mesh);
        mesh = this.createCornerMesh(Side.Back,  Side.Left,  Side.Top, new THREE.Vector3(-1, 1, 1));
        this.cubeMesh.add(mesh); this.planes.push(mesh);

        mesh = this.createCornerMesh(Side.Front, Side.Left,  Side.Bottom, new THREE.Vector3(-1, -1, -1));
        this.cubeMesh.add(mesh); this.planes.push(mesh);
        mesh = this.createCornerMesh(Side.Right, Side.Front, Side.Bottom, new THREE.Vector3(1, -1, -1));
        this.cubeMesh.add(mesh); this.planes.push(mesh);
        mesh = this.createCornerMesh(Side.Back,  Side.Right, Side.Bottom, new THREE.Vector3(1, 1, -1));
        this.cubeMesh.add(mesh); this.planes.push(mesh);
        mesh = this.createCornerMesh(Side.Left,  Side.Back,  Side.Bottom, new THREE.Vector3(-1, 1, -1));
        this.cubeMesh.add(mesh); this.planes.push(mesh);
    }

    createLabels() {
        let sides = [ Side.Front, Side.Back, Side.Left, Side.Right, Side.Top, Side.Bottom, ];
        let sidesName = ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom',  ];
        let canvasSize = 256; // textures need 2^N, N=7
        let fontSize = 72;
    
        {
          // find common font size
          let longestString = 'Bottom';
          let canvas = document.createElement('canvas');
          canvas.width = canvasSize; canvas.height = canvasSize;
          let ctx = canvas.getContext('2d');
    
          ctx.font = `bold ${fontSize}px Arial`;
          let pixels = ctx.measureText(longestString);
          let ratio = canvasSize / pixels.width;
          fontSize = Math.round(fontSize * ratio * 0.9); // 90% for padding
        }
    
        for (let i in sides) {
          let side = sides[i];
          let str = sidesName[i];
    
          let canvas = document.createElement('canvas');
          canvas.width = canvasSize; canvas.height = canvasSize;
          let ctx = canvas.getContext('2d');
          ctx.fillStyle = `#${this.params.faceColor.toString(16)}`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
    
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = 'black';
          ctx.fillText(str, canvas.width / 2, canvas.height / 2);
    
          let mesh = this.getMeshOfSide(side);
          mesh.material.map = new THREE.CanvasTexture(canvas);
        }
    }
};