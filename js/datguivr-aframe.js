
AFRAME.registerComponent('datgui', {
  name: {
    type: 'string',
    default: 'settings'
  },
  schema: {
    controllerRight: {
      type: 'selector',
      default: '#controller_right'
    },
    controllerLeft: {
      type: 'selector',
      default: '#controller_left'
    },
    name: {
      type: 'string',
      default: 'controls'
    }
  },
  init: function(){
    const gui = dat.GUIVR.create( this.data.name );
    this.el.setObject3D('gui', gui );
    this.el.gui = gui;

    const scene = this.el.sceneEl.object3D;

    console.log( {e:this.el.sceneEl} );

    function bindInput( el, input ){
      el.addEventListener('triggerdown', function(){
        input.pressed( true );
      });
      el.addEventListener('triggerup', function(){
        input.pressed( false );
      });
      el.addEventListener('gripdown', function(){
        input.gripped( true );
      });
      el.addEventListener('gripup', function(){
        input.gripped( false );
      });
    }

    const controllerRightEl = this.data.controllerRight;
    if( controllerRightEl ){
      const right = dat.GUIVR.addInputObject( controllerRightEl.object3D );
      scene.add( right );
      bindInput( controllerRightEl, right );
    }

    const controllerLeftEl = this.data.controllerLeft;
    if( controllerLeftEl ){
      const left = dat.GUIVR.addInputObject( controllerRightEl.object3D );
      scene.add( left );
      bindInput( controllerLeftEl, left );
    }

    const { camera, renderer } = this.el.sceneEl;
    dat.GUIVR.enableMouse( camera, renderer );

    if( this.data.name ){
      gui.name( this.data.name );
    }
  }
});

AFRAME.registerPrimitive('a-datgui', {
  defaultComponents: {
    datgui: {}
  },
  mappings: {
    name: 'datgui.name',
    controllerRight: 'datgui.controllerRight',
    controllerLeft: 'datgui.controllerLeft'
  }
});

AFRAME.registerComponent( 'guicontroller', {
  schema: {
    min: {
      type: 'number',
      default: 0
    },
    max: {
      type: 'number',
      default: 1
    },
    step: {
      type: 'number',
      default: 0.1
    },
    type: {
      type: 'string',
      default: 'slider'
    },
    defaultValue: {
      type: 'boolean',
      default: false
    },
    name: {
      type: 'string',
      default: undefined
    }
  },
  init: function(){
    const that = this;

    const gui = that.el.parentNode.gui;

    switch( that.data.type ){
      case 'slider':
        console.log( that.data );
        that.controller = gui.addSlider( that.data.min, that.data.max ).step( that.data.step );
        break;
      case 'dropdown':
        const options = {};
        Array
          .from( that.el.getElementsByTagName('a-gui-option') )
          .forEach( function( el ){
            options[ el.textContent ] = el.getAttribute('value');
          });
        that.controller = gui.addDropdown( options );
        break;
      case 'checkbox':
        that.controller = gui.addCheckbox( that.data.defaultValue );
        break;
      case 'button':
        that.controller = gui.addButton( function(){} );
        break;
    }

    if( that.controller && that.data.name !== undefined ){
      that.controller.name( that.data.name );
    }

    if( that.controller && that.controller.onChange ){
      that.controller.onChange( function( v ){
        that.el.emit( 'onChanged', {value: v} );
      });
    }

  }
});

AFRAME.registerPrimitive( 'a-gui-slider', {
  defaultComponents: {
    'guicontroller': {
      type: 'slider'
    }
  },
  mappings: {
    name: 'guicontroller.name',
    min: 'guicontroller.min',
    max: 'guicontroller.max',
    step: 'guicontroller.step'
  }
});

AFRAME.registerPrimitive( 'a-gui-dropdown', {
  defaultComponents: {
    'guicontroller': {
      type: 'dropdown'
    }
  },
  mappings: {
    name: 'guicontroller.name'
  }
});

AFRAME.registerPrimitive( 'a-gui-checkbox', {
  defaultComponents: {
    'guicontroller': {
      type: 'checkbox'
    }
  },
  mappings: {
    name: 'guicontroller.name',
    default: 'guicontroller.defaultValue'
  }
});

AFRAME.registerPrimitive( 'a-gui-button', {
  defaultComponents: {
    'guicontroller': {
      type: 'button'
    }
  },
  mappings: {
    name: 'guicontroller.name'
  }
});

const guiOptionTag = document.registerElement('a-gui-option');