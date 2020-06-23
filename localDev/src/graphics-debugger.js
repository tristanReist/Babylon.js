// Manage the views
// This class allows you to register / unregister a view making the view drawn or not
window.ViewManager = class ViewManager {
    constructor(engine) {
        this.debugViews = [];
        this.fullscreenView = null;

        this.engine = engine;
    }

    set fullscreenView(view) {
        if (this._fullscreenView) {
            this._fullscreenView.isFullscreen = false;
        }

        this._fullscreenView = view;

        if (this._fullscreenView) {
            this._fullscreenView.isFullscreen = true;

            // We remove then add the views that are not fullscreen
            // In order to make the fullscreen view rendered first
            for (let i = 0; i < this.debugViews.length; i++) {
                if (!this.debugViews[i].isFullscreen) {
                    const viewCopy = this.debugViews[i];
                    this.RemoveView(i);
                    this.AddView(viewCopy);
                }
            }
        }
    }

    get fullscreenView() {
        return this._fullscreenView;
    }

    /**
     * Register the passed view 
     * This makes the view drawn on the screen
     * @param {View} view
     */
    AddView(view) {
        const freeId = this.debugViews.findIndex(registeredView => !registeredView);

        this.engine.onEndFrameObservable.add(view.render.bind(view));

        if(freeId >= 0) {
            this.debugViews[freeId] = view;
            return freeId;
        }

        return this.debugViews.push(view) - 1;
    }

    /**
     * Remove the view corresponding to the passed id
     * @param {number} id
     */
    RemoveView(id) {
        this.engine.onEndFrameObservable.remove(this.debugViews[id].render);

        this.debugViews[id] = null;
    }
};

// This class is a base class and you must use it through a child class
window.ColorTextureView = class ColorTextureView {
    /**
     * Initialize the View object
     * @param {HTMLCanvasElement} canvas
     * @param {Vector2} position top left corner position of the view
     * @param {Vector2} size
     * @param {InternalTexture} texture optional
     */
    constructor(canvas, position, size, texture) {
        this.position = position.clone();
        this.size = size.clone();

        this.canvas = canvas;
        this.glContext = canvas.getContext("webgl2"); 

        this._isFullscreen = false;
        this.texture = texture || null;

        const savedStates = this._getRenderStates();
        this._createQuad();
        this._setRenderStates(savedStates);
    }


    set isFullscreen(isFullscreen) {
        this._isFullscreen = isFullscreen;

        // Recreate the vertex buffer and update the VAO
        const savedStates = this._getRenderStates();
        this._createVertexBuffer();
        this._createVertexArray();
        this._setRenderStates(savedStates);
    }

    get isFullscreen() {
        return this._isFullscreen;
    }


    /**
     * Set the texture drawn in the view
     * The texture is set as COLORATTACHEMENT on the view framebuffer
     * @param {InternalTexture} texture
     */
    set texture(texture) {
        if (texture && texture._webGLTexture) {
            this._texture = texture;
            this.webGLTexture = texture._webGLTexture;
        } else if(!texture) {
            console.warn("Undefined texture");
        } else if (!texture._webGLTexture) {
            console.warn("Unedefined webGLTexture");
        }
    }

    /**
     * Return the view texture to debug
     */
    get texture() {
        return this._texture;
    }

    /**
     * Render the view by blitting the view framebuffer on the default framebuffer
     */
    render() {
        const savedStates = this._getRenderStates();

        // Ensure the quad will be displayed
        this.glContext.cullFace(this.glContext.BACK);
        this.glContext.frontFace(this.glContext.CW);

        this.glContext.bindFramebuffer(this.glContext.FRAMEBUFFER, null);

        this.glContext.useProgram(this.shaderProgram);

        // Bind index buffer
        this.glContext.bindVertexArray(this.vertexArrayObject);
        this.glContext.bindBuffer(this.glContext.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        this.glContext.activeTexture(this.glContext.TEXTURE0);
        this.glContext.bindTexture(this.glContext.TEXTURE_2D, this.webGLTexture);

        const textureLocation = this.glContext.getUniformLocation(this.shaderProgram, "texture");
        this.glContext.uniform1i(textureLocation, 0);

        this.glContext.texParameteri(this.glContext.TEXTURE_2D, this.glContext.TEXTURE_MIN_FILTER, this.glContext.LINEAR);
        this.glContext.texParameteri(this.glContext.TEXTURE_2D, this.glContext.TEXTURE_MAG_FILTER, this.glContext.LINEAR);

        this.glContext.drawElements(this.glContext.TRIANGLES, 6, this.glContext.UNSIGNED_SHORT, 0);

        this._setRenderStates(savedStates);
    }

    /**
     * WebGL states copy
     */

    /**
     * Save WebGL states before render into an object
     * The resulted object must be used later to restore those states
     * @return {Object} object containing WebGL states
     */
    _getRenderStates() {
        let cullMode = null;

        if (this.glContext.getParameter(this.glContext.CULL_FACE)) {
            cullMode = this.glContext.getParameter(this.glContext.CULL_FACE_MODE);
        }

        return {
            program: this.glContext.getParameter(this.glContext.CURRENT_PROGRAM),
            framebuffer: this.glContext.getParameter(this.glContext.FRAMEBUFFER_BINDING),
            vertexArray: this.glContext.getParameter(this.glContext.VERTEX_ARRAY_BINDING),
            vertexBuffer: this.glContext.getParameter(this.glContext.ARRAY_BUFFER_BINDING),
            elementBuffer: this.glContext.getParameter(this.glContext.ELEMENT_ARRAY_BUFFER_BINDING),
            textureID: this.glContext.getParameter(this.glContext.ACTIVE_TEXTURE),
            texture: this.glContext.getParameter(this.glContext.TEXTURE_BINDING_2D),
            frontFace: this.glContext.getParameter(this.glContext.FRONT_FACE),
            cullMode,
        };
    }

    /**
     * Set WebGL states
     * @param {Object} renderStates
     * @param {WebGLProgram} renderStates.program
     * @param {WebGLBuffer} renderStates.vertexArray
     * @param {WebGLBuffer} renderStates.elementBuffer
     * @param {WebGLTexture} renderStates.texture
     */
    _setRenderStates(renderStates) {
        this.glContext.bindFramebuffer(this.glContext.FRAMEBUFFER, renderStates.framebuffer);
        this.glContext.useProgram(renderStates.program);
        this.glContext.bindVertexArray(renderStates.vertexArray);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, renderStates.vertexBuffer);
        this.glContext.bindBuffer(this.glContext.ELEMENT_ARRAY_BUFFER, renderStates.elementBuffer);
        this.glContext.activeTexture(renderStates.textureID);
        this.glContext.bindTexture(this.glContext.TEXTURE_2D, renderStates.texture);
        this.glContext.frontFace(renderStates.frontFace);

        if (renderStates.cullMode) {
            this.glContext.cullFace(renderStates.cullMode);
        }
    }

    /**
     * WebGL functions creating the quad
     */

    _createQuad() {
        this._createVertexBuffer();
        this._createUVBuffer();
        this._createIndexBuffer();
        this._createShaderProgram();
        this._createVertexArray();
    }


    /**
     * Create NDC coordinates vertices
     * This is done by mapping the view and the canvas dimensions to the NDC coordinates
     *
     * @returns {Float32Array}
     */
    _viewSizedVerticesArray() {
        const invertedY = this.canvas.height - this.position.y;
        const canvasHalfWidth = this.canvas.width * 0.5;
        const canvasHalfHeight = this.canvas.height * 0.5;

        return new Float32Array([
            (this.position.x / canvasHalfWidth) - 1, (invertedY / canvasHalfHeight) - 1,
            ((this.position.x + this.size.x) / canvasHalfWidth) - 1, ((invertedY - this.size.y) / canvasHalfHeight) - 1,
            (this.position.x / canvasHalfWidth) - 1, ((invertedY - this.size.y) / canvasHalfHeight) - 1,
            ((this.position.x + this.size.x) / canvasHalfWidth) - 1, (invertedY / canvasHalfHeight) - 1,
        ]);
    }

    /**
     * Create NDC coordinates vertices
     * Those vertices coordinates are just the 4 for corners of the NDC space
     *
     * @returns {Float32Array}
     */
    _fullscreenVerticesArray() {
        return new Float32Array([
            -1, 1,
            1, -1,
            -1, -1,
            1, 1,
        ]);
    }


    /**
     * Create NDC coordinates vertices
     * This is done by mapping the view and the canvas dimensions to the NDC coordinates
     *
     * Then create a vertex buffer out of those vertices
     */
    _createVertexBuffer() {
        const vertices = this.isFullscreen ? this._fullscreenVerticesArray() : this._viewSizedVerticesArray();
        this.vertexBuffer = this.glContext.createBuffer();
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, this.vertexBuffer);
        this.glContext.bufferData(this.glContext.ARRAY_BUFFER, vertices, this.glContext.STATIC_DRAW);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);
    }
    
    _createUVBuffer() {
        const uvs = new Float32Array([
            0, 1,
            1, 0,
            0, 0,
            1, 1,
        ]);

        this.uvBuffer = this.glContext.createBuffer();
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, this.uvBuffer);
        this.glContext.bufferData(this.glContext.ARRAY_BUFFER, uvs, this.glContext.STATIC_DRAW);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);
    }

    _createIndexBuffer() {
        const indices = new Uint16Array([
            0, 1, 2,
            0, 3, 1,
        ]);

        this.indexBuffer = this.glContext.createBuffer();
        this.glContext.bindBuffer(this.glContext.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.glContext.bufferData(this.glContext.ELEMENT_ARRAY_BUFFER, indices, this.glContext.STATIC_DRAW);
        this.glContext.bindBuffer(this.glContext.ELEMENT_ARRAY_BUFFER, null);
    }

    _createShaderProgram() {
        const vertShaderCode = `
            attribute vec2 inPosition;
            attribute highp vec2 inUV;

            varying highp vec2 vUV;

            void main()
            {
                vUV = inUV;
                gl_Position = vec4(inPosition, 0.0, 1.0);
            }
        `;
        const vertexShader = this.glContext.createShader(this.glContext.VERTEX_SHADER);
        this.glContext.shaderSource(vertexShader, vertShaderCode);
        this.glContext.compileShader(vertexShader);
        if (!this.glContext.getShaderParameter(vertexShader, this.glContext.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shader: ' + this.glContext.getShaderInfoLog(vertexShader));
        }

        const fragShaderCode = `
            precision mediump float;

            uniform sampler2D texture;

            varying highp vec2 vUV;

            void main()
            {
                gl_FragColor = vec4(texture2D(texture, vUV));
            }
        `;
        const fragmentShader = this.glContext.createShader(this.glContext.FRAGMENT_SHADER);
        this.glContext.shaderSource(fragmentShader, fragShaderCode);
        this.glContext.compileShader(fragmentShader);
        if (!this.glContext.getShaderParameter(fragmentShader, this.glContext.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shader: ' + this.glContext.getShaderInfoLog(fragmentShader));
        }

        this.shaderProgram = this.glContext.createProgram();
        this.glContext.attachShader(this.shaderProgram, vertexShader);
        this.glContext.attachShader(this.shaderProgram, fragmentShader);
        this.glContext.linkProgram(this.shaderProgram);

        if (!this.glContext.getProgramParameter(this.shaderProgram, this.glContext.LINK_STATUS)) {
            console.log(this.glContext.getProgramInfoLog(program));
        }
    }

    _createVertexArray() {
        this.glContext.useProgram(this.shaderProgram);

        this.vertexArrayObject = this.glContext.createVertexArray();
        this.glContext.bindVertexArray(this.vertexArrayObject);

        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, this.vertexBuffer);
        const positionLocation = this.glContext.getAttribLocation(this.shaderProgram, "inPosition");
        this.glContext.vertexAttribPointer(positionLocation, 2, this.glContext.FLOAT, false, 8, 0);
        this.glContext.enableVertexAttribArray(positionLocation);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);

        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, this.uvBuffer);
        const uvLocation = this.glContext.getAttribLocation(this.shaderProgram, "inUV");
        this.glContext.vertexAttribPointer(uvLocation, 2, this.glContext.FLOAT, false, 8, 0);
        this.glContext.enableVertexAttribArray(uvLocation);
        this.glContext.bindBuffer(this.glContext.ARRAY_BUFFER, null);

        this.glContext.bindVertexArray(null);

        this.glContext.useProgram(null);
    }

}

window.DepthTextureView = class DepthTextureView extends ColorTextureView {
    /**
     * Initialize the RGBTextureView object
     * @param {HTMLCanvasElement} canvas
     * @param {Vector2} position top left position of the view
     * @param {Vector2} size
     * @param {InternalTexture} texture optional
     */
    constructor(canvas, position, size, texture, nearFarDifference) {
        super(canvas, position, size, texture);

        this.nearFarDifference = nearFarDifference;
    }

    /**
     * Accessors
     */

    set nearFarDifference(nearFarDifference) {
        this._nearFarDifference = nearFarDifference;
    }

    get nearFarDifference() {
        return this._nearFarDifference;
    }

    /**
     * Render the view by blitting the view framebuffer on the default framebuffer
     */
    render() {
        const savedStates = this._getRenderStates();

        // Ensure the quad will be displayed
        this.glContext.cullFace(this.glContext.BACK);
        this.glContext.frontFace(this.glContext.CW);

        this.glContext.bindFramebuffer(this.glContext.FRAMEBUFFER, null);

        this.glContext.useProgram(this.shaderProgram);

        // Bind index buffer
        this.glContext.bindVertexArray(this.vertexArrayObject);
        this.glContext.bindBuffer(this.glContext.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.glContext.bindTexture(this.glContext.TEXTURE_2D, this.webGLTexture);

        this.glContext.texParameteri(this.glContext.TEXTURE_2D, this.glContext.TEXTURE_MIN_FILTER, this.glContext.NEAREST);
        this.glContext.texParameteri(this.glContext.TEXTURE_2D, this.glContext.TEXTURE_MAG_FILTER, this.glContext.NEAREST);

        const nearFarDifferenceLocation = this.glContext.getUniformLocation(this.shaderProgram, "nearFarDifference");
        this.glContext.uniform1f(nearFarDifferenceLocation, this.nearFarDifference);
        this.glContext.drawElements(this.glContext.TRIANGLES, 6, this.glContext.UNSIGNED_SHORT, 0);

        this._setRenderStates(savedStates);
    }


    _createShaderProgram() {
        const vertShaderCode = `
            attribute vec3 inPosition;
            attribute highp vec2 inUV;

            varying highp vec2 vUV;

            void main()
            {
                vUV = inUV;
                gl_Position = vec4(inPosition, 1.0);
            }
        `;
        const vertexShader = this.glContext.createShader(this.glContext.VERTEX_SHADER);
        this.glContext.shaderSource(vertexShader, vertShaderCode);
        this.glContext.compileShader(vertexShader);
        if (!this.glContext.getShaderParameter(vertexShader, this.glContext.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shader: ' + this.glContext.getShaderInfoLog(vertexShader));
        }

        const fragShaderCode = `
            precision mediump float;

            uniform float nearFarDifference;

            uniform sampler2D texture;

            varying highp vec2 vUV;

            void main()
            {
                vec3 color = vec3(texture2D(texture, vUV).x / nearFarDifference);
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        const fragmentShader = this.glContext.createShader(this.glContext.FRAGMENT_SHADER);
        this.glContext.shaderSource(fragmentShader, fragShaderCode);
        this.glContext.compileShader(fragmentShader);
        if (!this.glContext.getShaderParameter(fragmentShader, this.glContext.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shader: ' + this.glContext.getShaderInfoLog(fragmentShader));
        }

        this.shaderProgram = this.glContext.createProgram();
        this.glContext.attachShader(this.shaderProgram, vertexShader);
        this.glContext.attachShader(this.shaderProgram, fragmentShader);
        this.glContext.linkProgram(this.shaderProgram);

        if (!this.glContext.getProgramParameter(this.shaderProgram, this.glContext.LINK_STATUS)) {
            console.log(this.glContext.getProgramInfoLog(program));
        }
    }
};
