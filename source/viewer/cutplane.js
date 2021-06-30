
OV.CutPlane = class
{
    constructor (viewer, sliderParentDiv, Slider = OV.Slider)
    {
        this.viewer = viewer;
        let bsphere = viewer.GetBoundingSphere(function(){return true;});
        if (bsphere === null) { 
          return; 
        }

        // Used for showing the cut plane
        let planeGeometry = new THREE.PlaneGeometry (bsphere.radius * 2.2, bsphere.radius * 2.2);

        // Need to figure out the cutting limits, position and direction
        let cutPlanePos = bsphere.center.clone();
        this.normal = (new THREE.Vector3()).subVectors(cutPlanePos, this.viewer.camera.position);
        this.normal.normalize();
        this.cutPlanePos = this.viewer.camera.position.clone();
        this.cutPlaneDistance = cutPlanePos.distanceTo(this.viewer.camera.position);
        this.maxPlaneDistance = cutPlanePos.clone().addScaledVector(this.normal, bsphere.radius).distanceTo(this.viewer.camera.position);
        this.minPlaneDistance = cutPlanePos.clone().addScaledVector(this.normal, -bsphere.radius).distanceTo(this.viewer.camera.position);


        this.cutPlane = new THREE.Plane ();
        this.cutPlane.setFromNormalAndCoplanarPoint(this.normal, cutPlanePos);

		this.mesh = new THREE.Mesh (planeGeometry, new THREE.MeshBasicMaterial ( { color: 0x00ff00, transparent: true,  opacity: 0.3, side: THREE.DoubleSide } ));

        this.mesh.position.copy (this.ComputeNewPlanePosition (this.minPlaneDistance / 100));
        this.mesh.quaternion.setFromUnitVectors (new THREE.Vector3 (0, 0, 1), this.normal);

        // Create the stencil for the cut plane
        this.modelGeometry = this.viewer.geometry.modelMeshes[0].geometry.clone();
        this.poGroup = new THREE.Group();
        this.stencilGroup = new THREE.Group();
        this.stencilGroup.add(this.CreatePlaneStencilGroup( this.modelGeometry, this.cutPlane, 1 ));

        let texture = new THREE.TextureLoader().load('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAWUlEQVQ4jaWTOw4AMAhCuf+l6dCkX21FTZyUNygAANdWC0XxBCTFHVAQU1afN5MA1sHDAO9bIcDr1V/AzydPQMRkLiDqUHOi2PuaqtnYNjLBGlvZVKIiJskGbQ087tuFaxEAAAAASUVORK5CYIIA', 
                                                     function(e){ this.viewer.Render() }.bind(this));
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = this.viewer.renderer.capabilities.getMaxAnisotropy();
        texture.repeat.set(25,25);
        texture.rotation = Math.PI / 7;

        let planeMat = new THREE.MeshBasicMaterial({ 
            color: 0xf8e5c9, 
            clippingPlanes: [ ],
            map: texture,
            stencilWrite: true,
            stencilRef: 0,
            stencilFunc: THREE.NotEqualStencilFunc,
            stencilFail: THREE.ReplaceStencilOp,
            stencilZFail: THREE.ReplaceStencilOp,
            stencilZPass: THREE.ReplaceStencilOp,
        });
        this.planeObject = new THREE.Mesh(new THREE.PlaneGeometry (bsphere.radius * 4, bsphere.radius * 4), planeMat);
        this.planeObject.onAfterRender = function (renderer) { renderer.clearStencil(); };
        this.planeObject.renderOrder = 1.1;
        this.poGroup.add(this.planeObject);
        this.viewer.scene.add(this.stencilGroup);
        this.viewer.scene.add(this.poGroup);
        this.viewer.renderer.localClippingEnabled = true;
        this.ShadowMeshes();
        this.mesh.visible = true;
		this.viewer.scene.add (this.mesh);

        this.FixStencilPlaneOrientation();

        this.viewer.Render();
        this.slider = new Slider(0, 1000, this.CutPlaneAxisUpdated.bind(this));
        this.slider.CreateDomElement (sliderParentDiv);
    }

    ShadowMeshes ()
    {
        let modelMat = new THREE.MeshStandardMaterial( { color: 0xFFC107, metalness: 0.1, roughness: 0.75, 
            clippingPlanes: [ this.cutPlane ],
        });
        this.modelMeshes = [];
        this.edgesMeshes = [];
        for (let i = 0; i < this.viewer.geometry.modelMeshes.length; i++) {
          // Create the cut version for the clone
          this.modelMeshes.push(new THREE.Mesh(this.viewer.geometry.modelMeshes[i].geometry.clone(), modelMat));
          this.modelMeshes[i].originalVisible = this.viewer.geometry.modelMeshes[i].visible;
          this.modelMeshes[i].position.copy(this.viewer.geometry.modelMeshes[i].position);
          this.modelMeshes[i].renderOrder = 2;
          this.viewer.scene.add(this.modelMeshes[i]);    
          // Hide the initial models
          this.viewer.geometry.modelMeshes[i].visible = false;
        }
        let modelLineMat = new THREE.LineBasicMaterial( { color: 0x000000, clippingPlanes: [ this.cutPlane ] });
        for (let i = 0; i < this.viewer.geometry.edgesMeshes.length; i++) {
            // Create the cut version for the clone
            this.edgesMeshes.push(new THREE.LineSegments (this.viewer.geometry.edgesMeshes[i].geometry.clone(), modelMat));
            this.edgesMeshes[i].originalVisible = this.viewer.geometry.edgesMeshes[i].visible;
            this.edgesMeshes[i].position.copy(this.viewer.geometry.edgesMeshes[i].position);
            this.edgesMeshes[i].renderOrder = 2;
            this.viewer.scene.add(this.edgesMeshes[i]);    
            // Hide the initial models
            this.viewer.geometry.edgesMeshes[i].visible = false;
          }
      }


    FixStencilPlaneOrientation ()
    {
        let po = this.planeObject;
        this.cutPlane.coplanarPoint(po.position);
        this.planeObject.lookAt(po.position.x - this.cutPlane.normal.x, po.position.y - this.cutPlane.normal.y, po.position.z - this.cutPlane.normal.z);
    }

    CreatePlaneStencilGroup( geometry, plane, renderOrder ) 
    {
        const group = new THREE.Group();
        const baseMat = new THREE.MeshBasicMaterial();
        baseMat.depthWrite = false;
        baseMat.depthTest = false;
        baseMat.colorWrite = false;
        baseMat.stencilWrite = true;
        baseMat.stencilFunc = THREE.AlwaysStencilFunc;

        // back faces
        const mat0 = baseMat.clone();
        mat0.side = THREE.BackSide;
        mat0.clippingPlanes = [ plane ];
        mat0.stencilFail  = THREE.IncrementWrapStencilOp;
        mat0.stencilZFail = THREE.IncrementWrapStencilOp;
        mat0.stencilZPass = THREE.IncrementWrapStencilOp;

        const mesh0 = new THREE.Mesh(geometry, mat0);
        mesh0.renderOrder = renderOrder;
        group.add(mesh0);

        // front faces
        const mat1 = baseMat.clone();
        mat1.side = THREE.FrontSide;
        mat1.clippingPlanes = [ plane ];
        mat1.stencilFail  = THREE.DecrementWrapStencilOp;
        mat1.stencilZFail = THREE.DecrementWrapStencilOp;
        mat1.stencilZPass = THREE.DecrementWrapStencilOp;

        const mesh1 = new THREE.Mesh(geometry, mat1);
        mesh1.renderOrder = renderOrder;

        group.add(mesh1);
        return group;
    }

    ComputeNewPlanePosition (offset = 0)
    {
        return this.cutPlanePos.clone().addScaledVector(this.normal, this.cutPlaneDistance + offset);
    }

    CutPlaneAxisUpdated (v)
    {
        this.cutPlaneDistance = (v / 1000) * (this.maxPlaneDistance - this.minPlaneDistance) + this.minPlaneDistance;
        let pos = this.ComputeNewPlanePosition ();
        this.cutPlane.setFromNormalAndCoplanarPoint(this.normal, pos);
        this.FixStencilPlaneOrientation();
        // Small offset to have a kind of border
        this.mesh.position.copy (this.ComputeNewPlanePosition (this.minPlaneDistance / 100));
        this.viewer.Render ();
        return false;
    }


    Dispose ()
    {
        this.mesh.visible = false;
		this.viewer.scene.remove (this.mesh);
        for (let i = 0; i < this.modelMeshes.length; i++) {
            this.viewer.scene.remove (this.modelMeshes[i]);
            this.viewer.geometry.modelMeshes[i].visible = this.modelMeshes[i].originalVisible;
        }
        for (let i = 0; i < this.edgesMeshes.length; i++) {
            this.viewer.scene.remove (this.edgesMeshes[i]);
            this.viewer.geometry.edgesMeshes[i].visible = this.edgesMeshes[i].originalVisible;
        }
        this.viewer.scene.remove (this.poGroup);
        this.viewer.scene.remove (this.stencilGroup);

        this.viewer.Render ();
        this.slider.Dispose ();
    }
};