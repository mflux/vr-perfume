const cubeLoader = new THREE.CubeTextureLoader();
cubeLoader.setPath( 'assets/envmap/' );
const textureCube = cubeLoader.load( [
  'posx.jpg', 'negx.jpg',
  'posy.jpg', 'negy.jpg',
  'posz.jpg', 'negz.jpg'
] );

const standardMaterial = new THREE.MeshStandardMaterial({
  color: 0xeeeeee,
  envMap: textureCube,
  shading: THREE.FlatShading,
  metalness: 0.9,
  roughness: 0.1
});

const tetrahedronGeometry = new THREE.TetrahedronGeometry( 1.2, 2 );


AFRAME.registerComponent('bvh-skeleton', {
  // Allow line component to accept vertices and color.
  schema: {
    src: {
      type: 'string'
    },
    display: {
      type: 'boolean'
    }
  },
  init: function(){
    const display = this.data.display;
    const assetPath = this.data.src;
    this.clock = new THREE.Clock();

    const loader = new THREE.BVHLoader();
    const el = this.el;
    const that = this;
    el.skeletonViewEnabled = display;

    loader.load( assetPath, function( result ) {
      const skeletonHelper = that.skeletonHelper = new THREE.SkeletonHelper( result.skeleton.bones[ 0 ] );
      skeletonHelper.skeleton = result.skeleton;
      const boneContainer = new THREE.Group();
      boneContainer.add( result.skeleton.bones[ 0 ] );

      // play animation
      const mixer = that.mixer = new THREE.AnimationMixer( skeletonHelper );
      mixer.clipAction( result.clip ).setEffectiveWeight( 1.0 ).play().setLoop( THREE.LoopOnce );

      const group = new THREE.Group();
      group.add( skeletonHelper );
      group.add( boneContainer );

      that.skeletonView = skeletonHelper;

      skeletonHelper.visible = display;

      el.setObject3D( 'skeleton', group );

      el.emit('animation-loaded', {group, skeleton: result.skeleton});
    } );

  },

  tick: function( delta ){
    if( this.mixer ){
      this.mixer.update(this.clock.getDelta());
    };

    if( this.skeletonHelper ){
      this.skeletonHelper.update()
    };

    if( this.skeletonView ){
      this.skeletonView.visible = this.el.skeletonViewEnabled;
    }
  }
});

AFRAME.registerComponent('tetra-skin', {
  // Allow line component to accept vertices and color.
  dependencies: [ 'bvh-skeleton' ],
  schema: {
    type: 'string'
  },
  init: function(){
    const that = this;
    const meshes = that.meshes = [];

    that.el.tetraEnabled = true;

    that.el.addEventListener( 'animation-loaded', function( e ){
      const skeletonRoot = e.detail.skeleton.bones[0];

      const group = new THREE.Group();
      skeletonRoot.traverse( function( bone ){
        const sphere = new THREE.Mesh(
          tetrahedronGeometry,
          standardMaterial
        );
        sphere.bone = bone;
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        meshes.push( sphere );
        group.add( sphere );
      });

      that.el.setObject3D( 'tetra', group );
    });
  },

  tick: function( delta ){
    const that = this;
    const group = that.el.getObject3D( 'tetra' );
    if( group === undefined ){
      return;
    }

    if( that.el.tetraEnabled ){
      group.visible = true;
      that.meshes.forEach( function( m ){
        const bone = m.bone;
        m.position.setFromMatrixPosition( bone.matrixWorld );
        m.rotation.setFromRotationMatrix( bone.matrixWorld );
      });
    }
    else{
      group.visible = false;
    }

  }
});

AFRAME.registerComponent('ribbon-skin', {
  // Allow line component to accept vertices and color.
  dependencies: [ 'bvh-skeleton' ],
  schema: {
    maxLength: {
      type: 'int',
      default: 20
    },
    color: {
      type: 'string',
      default: '#ffffff'
    }
  },
  init: function(){
    const that = this;
    const meshes = that.meshes = [];

    that.tickMax = that.data.maxLength;

    that.el.ribbonEnabled = true;

    const ribbonIterations = 6;
    const randomScale = 2.0;
    const randomLerp = 0.4;
    this.el.addEventListener( 'animation-loaded', function( e ){
      const skeletonRoot = e.detail.skeleton.bones[0];
      const material = new THREE.LineBasicMaterial({color:0xffffff, vertexColors: THREE.VertexColors});

      const group = new THREE.Group();
      skeletonRoot.traverse( function( bone ){
        for( let r=0; r<ribbonIterations; r++ ){
          const geometry = new THREE.Geometry();
          for( let i=0; i<that.tickMax; i++ ){
            geometry.vertices.push( new THREE.Vector3() );
            const c = new THREE.Color();
            c.setStyle( that.data.color );
            const hsl = c.getHSL();
            c.setHSL( hsl.h, hsl.s, 1.0 - i/that.tickMax );
            geometry.colors.push( c )
          }
          const ribbon = new THREE.Line( geometry, material );
          ribbon.bone = bone;
          ribbon.frustumCulled = false;
          ribbon.castShadow = true;
          meshes.push( ribbon );
          group.add( ribbon );

          ribbon.offset = new THREE.Vector3(
            (-randomScale/2) + Math.random() * randomScale,
            (-randomScale/2) + Math.random() * randomScale,
            (-randomScale/2) + Math.random() * randomScale );

          if( bone.children.length === 0 ){
            ribbon.boneLerp = 0;
            break;
          }

          ribbon.boneLerp = r / ribbonIterations - randomLerp/2 + Math.random() * randomLerp;
        }
      });

      that.el.setObject3D( 'ribbon', group );
    });
  },

  tick: function( delta ){
    const that = this;
    if( that.el.getObject3D('ribbon') === undefined ){
      return;
    }

    if( that.el.ribbonEnabled ){
      that.el.getObject3D('ribbon').visible = true;
      const tVec = new THREE.Vector3();
      that.meshes.forEach( function( m ){
        const bone = m.bone;
        for( let i=m.geometry.vertices.length-1; i>0; i-- ){
          m.geometry.vertices[ i ].copy( m.geometry.vertices[ i-1 ] );
        }

        const vertex = m.geometry.vertices[ 0 ];
        vertex.setFromMatrixPosition( bone.matrixWorld ).add( m.offset );
        if( bone.children.length > 0 ){
          const childBone = bone.children[ 0 ];
          tVec.setFromMatrixPosition( childBone.matrixWorld );
          vertex.lerp( tVec, m.boneLerp );
        }
        m.geometry.verticesNeedUpdate = true;
      });
    }
    else{
      that.el.getObject3D('ribbon').visible = false;
    }

  }
});

window.onload = function init(){
  document.querySelector( '#controller_right' ).addEventListener('menudown', function(e){
    Array.from( document.querySelector( '#dancers' ).children ).forEach( function( element ){
      element.ribbonEnabled = !element.ribbonEnabled;
    });
  });
  document.querySelector( '#controller_right' ).addEventListener('trackpaddown', function(e){
    Array.from( document.querySelector( '#dancers' ).children ).forEach( function( element ){
      element.tetraEnabled = !element.tetraEnabled;
    });
  });
  document.querySelector( '#controller_right' ).addEventListener('gripdown', function(e){
    Array.from( document.querySelector( '#dancers' ).children ).forEach( function( element ){
      element.skeletonViewEnabled = !element.skeletonViewEnabled;
    });
  });

  const dancers = document.querySelector( '#dancers' );
  const ds = new THREE.Vector3();
  document.querySelector( '#scaleControl' ).addEventListener('onChanged', function( e ){
    ds.setScalar( e.detail.value );
    dancers.setAttribute( 'scale', ds );
  });

  const soundtrack = document.querySelector( '#soundtrack' );
  window.setTimeout(function(){
    soundtrack.components.sound.playSound();
  }, 4000)

};
