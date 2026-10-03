function DracoThread() {
    let decoderConfig, decoderPending;
    function onError(opts) {
      opts.message.preloading && console.warn(opts.er);
      let plane = new PlaneGeometry(1, 1).toNonIndexed(),
        buff = [],
        data = {};
      for (let key in plane.attributes)
        ((data[key] = plane.attributes[key].array),
          buff.push(data[key].buffer));
      (computeBounding(data), opts?.resolve(data, opts.id, buff));
    }
    function readJsonHeader(buffer) {
      const decoder = new TextDecoder(),
        jsonSize = parseInt(decoder.decode(buffer.slice(0, 10)));
      return [
        JSON.parse(decoder.decode(buffer.slice(10, 10 + jsonSize))),
        buffer.slice(10 + jsonSize),
      ];
    }
    async function fetchAndDecodeDracoBundle(message, id) {
      let res = await fetch(message.path);
      if (!res.ok) throw new Error("HTTP Error");
      let bundleBuffer = await res.arrayBuffer(),
        [header, buffersBuffer] = readJsonHeader(bundleBuffer),
        offset = 0;
      const draco = (await decoderPending).draco,
        geometries = [],
        allBuffers = [];
      (header.buffers.forEach((byteLength) => {
        let nextOffset = offset + byteLength,
          dracoBuffer = buffersBuffer.slice(offset, nextOffset);
        offset = nextOffset;
        const [geometry, buffers] = decodeDracoBuffer(dracoBuffer, draco);
        (message.custom && self[message.custom](geometry),
          geometries.push(geometry),
          allBuffers.push(...buffers));
      }),
        resolve({ geometries: geometries }, id, allBuffers));
    }
    async function fetchAndDecodeDraco(message, id) {
      let res = await fetch(message.path);
      if (!res.ok) throw new Error("HTTP Error");
      let dracoBuffer = await res.arrayBuffer();
      const module = await decoderPending,
        [response, buffers] = decodeDracoBuffer(dracoBuffer, module.draco);
      (message.custom && self[message.custom](response),
        resolve(response, id, buffers));
    }
    async function fetchAndDecodeDracoSkinAnimation(message, id) {
      let res = await fetch(message.path);
      if (!res.ok) throw new Error("HTTP Error");
      let dracoBuffer = await res.arrayBuffer();
      const module = await decoderPending,
        [response, , jsonData] = decodeDracoBuffer(dracoBuffer, module.draco);
      let animation = {
          duration: jsonData.duration,
          orientationNormalized: !0,
          skeleton: [],
        },
        boneCount = response.offset_0.length / 3;
      for (let boneIndex = 0; boneIndex < boneCount; ++boneIndex) {
        let keys = [];
        animation.skeleton[boneIndex] = { keys: keys };
        for (let i = 0; i < jsonData.frameCount; ++i) {
          let offset = response[`offset_${i}`],
            orientation = response[`orientation_${i}`],
            scale = response[`scale_${i}`],
            rot = Array.from(
              orientation.slice(4 * boneIndex, 4 * boneIndex + 4),
            ),
            l = Math.sqrt(
              rot[0] * rot[0] +
                rot[1] * rot[1] +
                rot[2] * rot[2] +
                rot[3] * rot[3],
            );
          ((rot[0] /= l),
            (rot[1] /= l),
            (rot[2] /= l),
            (rot[3] /= l),
            keys.push({
              time: jsonData.frameTimes?.[i] ?? i,
              pos: Array.from(offset.slice(3 * boneIndex, 3 * boneIndex + 3)),
              rot: rot,
              scl: Array.from(scale.slice(3 * boneIndex, 3 * boneIndex + 3)),
            }));
        }
      }
      (message.custom && self[message.custom](response, jsonData),
        resolve(animation, id));
    }
    function decodeDracoBuffer(dracoBuffer, draco) {
      let [jsonData, buffer] = readJsonHeader(dracoBuffer);
      const TYPED_ARRAYS = Object.values(Geometry.TYPED_ARRAYS),
        attributeIDs = {},
        attributeTypes = {};
      jsonData.attributes.forEach((att, i) => {
        const name = att[0];
        ((attributeIDs[name] = i),
          (attributeTypes[name] = TYPED_ARRAYS[att[1]]));
      });
      const taskConfig = {
          attributeIDs: attributeIDs,
          attributeTypes: attributeTypes,
          useUniqueIDs: !0,
        },
        isMesh = 0 === jsonData.type,
        decoder = new draco.Decoder();
      try {
        const geometry = decodeGeometry(draco, decoder, buffer, taskConfig),
          buffers = geometry.attributes.map((attr) => attr.array.buffer);
        isMesh && geometry.index && buffers.push(geometry.index.array.buffer);
        const response = {
          _type: "BufferGeometry",
          userData: jsonData.userData || {},
        };
        return (
          (response.userData.dracoType = jsonData.type),
          (response.userData.name = jsonData.name),
          isMesh && geometry.index && (response.index = geometry.index.array),
          geometry.bones && (response.bones = geometry.bones),
          geometry.attributes.forEach((att) => {
            ((response[att.name] = att.array),
              (response[`${att.name}ItemSize`] = att.itemSize));
          }),
          isMesh && response.position && computeBounding(response),
          [response, buffers, jsonData]
        );
      } finally {
        draco.destroy(decoder);
      }
    }
    function decodeGeometry(draco, decoder, buffer, taskConfig) {
      const attributeIDs = taskConfig.attributeIDs,
        attributeTypes = taskConfig.attributeTypes;
      let dracoGeometry,
        decodingStatus,
        bytes = new Int8Array(buffer);
      const geometryType = decoder.GetEncodedGeometryType(bytes);
      if (geometryType === draco.TRIANGULAR_MESH)
        ((dracoGeometry = new draco.Mesh()),
          (decodingStatus = decoder.DecodeArrayToMesh(
            bytes,
            bytes.byteLength,
            dracoGeometry,
          )));
      else {
        if (geometryType !== draco.POINT_CLOUD)
          throw new Error("DRACOLoader: Unexpected geometry type.");
        ((dracoGeometry = new draco.PointCloud()),
          (decodingStatus = decoder.DecodeArrayToPointCloud(
            bytes,
            bytes.byteLength,
            dracoGeometry,
          )));
      }
      if (!decodingStatus.ok() || 0 === dracoGeometry.ptr)
        throw new Error(
          "DRACOLoader: Decoding failed: " + decodingStatus.error_msg(),
        );
      const geometry = { index: null, attributes: [] };
      for (const attributeName in attributeIDs) {
        const attributeType = attributeTypes[attributeName];
        let attribute, attributeID;
        if (taskConfig.useUniqueIDs)
          ((attributeID = attributeIDs[attributeName]),
            (attribute = decoder.GetAttributeByUniqueId(
              dracoGeometry,
              attributeID,
            )));
        else {
          if (
            ((attributeID = decoder.GetAttributeId(
              dracoGeometry,
              draco[attributeIDs[attributeName]],
            )),
            -1 === attributeID)
          )
            continue;
          attribute = decoder.GetAttribute(dracoGeometry, attributeID);
        }
        let attr = decodeAttribute(
          draco,
          decoder,
          dracoGeometry,
          attributeName,
          attributeType,
          attribute,
        );
        (geometry.attributes.push(attr),
          "skinIndex" === attributeName &&
            attr.array.forEach((value, i) => {
              attr.array[i] = Math.round(value);
            }));
      }
      geometryType === draco.TRIANGULAR_MESH &&
        (geometry.index = decodeIndex(draco, decoder, dracoGeometry));
      let metadata = decoder.GetMetadata(dracoGeometry);
      if (metadata.ptr) {
        const querier = new draco.MetadataQuerier();
        let json = querier.GetStringEntry(metadata, "json");
        if (json) {
          const data = JSON.parse(json);
          (data.rig || data.bones) &&
            (geometry.bones = data.rig ? data.rig.bones : data.bones);
        }
        draco.destroy(querier);
      }
      return (draco.destroy(dracoGeometry), geometry);
    }
    function decodeIndex(draco, decoder, dracoGeometry) {
      const numIndices = 3 * dracoGeometry.num_faces(),
        byteLength = 4 * numIndices,
        ptr = draco._malloc(byteLength);
      decoder.GetTrianglesUInt32Array(dracoGeometry, byteLength, ptr);
      const index = new Uint32Array(
        draco.HEAPF32.buffer,
        ptr,
        numIndices,
      ).slice();
      return (draco._free(ptr), { array: index, itemSize: 1 });
    }
    function decodeAttribute(
      draco,
      decoder,
      dracoGeometry,
      attributeName,
      attributeType,
      attribute,
    ) {
      const numComponents = attribute.num_components(),
        numValues = dracoGeometry.num_points() * numComponents,
        byteLength = numValues * attributeType.BYTES_PER_ELEMENT,
        dataType = getDracoDataType(draco, attributeType),
        ptr = draco._malloc(byteLength);
      decoder.GetAttributeDataArrayForAllPoints(
        dracoGeometry,
        attribute,
        dataType,
        byteLength,
        ptr,
      );
      const array = new attributeType(
        draco.HEAPF32.buffer,
        ptr,
        numValues,
      ).slice();
      return (
        draco._free(ptr),
        { name: attributeName, array: array, itemSize: numComponents }
      );
    }
    function getDracoDataType(draco, attributeType) {
      switch (attributeType) {
        case Float32Array:
          return draco.DT_FLOAT32;
        case Int8Array:
          return draco.DT_INT8;
        case Int16Array:
          return draco.DT_INT16;
        case Int32Array:
          return draco.DT_INT32;
        case Uint8Array:
          return draco.DT_UINT8;
        case Uint16Array:
          return draco.DT_UINT16;
        case Uint32Array:
          return draco.DT_UINT32;
      }
    }
    ((this.loadDraco = function (e, id) {
      const message = e;
      switch (message.type) {
        case "init":
          ((decoderConfig = message.decoderConfig),
            (decoderPending = new Promise(function (pendingResolve) {
              ((decoderConfig.onModuleLoaded = function (draco) {
                (pendingResolve({ draco: draco }), resolve({}, id));
              }),
                DracoDecoderModule(decoderConfig));
            })));
          break;
        case "decode_buffer_gltf":
          ((dracoBuffer, dataAttrib) => {
            const buffer = dracoBuffer,
              attributeIDs = {},
              attributeTypes = {},
              TYPE_ARRAY = {
                5121: Uint8Array,
                5122: Int16Array,
                5123: Uint16Array,
                5125: Uint32Array,
                5126: Float32Array,
                "image/jpeg": Uint8Array,
                "image/png": Uint8Array,
              };
            dataAttrib.forEach((att) => {
              const name = att.name;
              ((attributeIDs[name] = att.id),
                (attributeTypes[name] = TYPE_ARRAY[att.type]));
            });
            const taskConfig = {
              attributeIDs: attributeIDs,
              attributeTypes: attributeTypes,
              useUniqueIDs: !0,
            };
            decoderPending.then((module) => {
              const draco = module.draco,
                decoder = new draco.Decoder();
              try {
                const geometry = decodeGeometry(
                    draco,
                    decoder,
                    buffer,
                    taskConfig,
                  ),
                  buffers = geometry.attributes.map(
                    (attr) => attr.array.buffer,
                  );
                geometry.index && buffers.push(geometry.index.array.buffer);
                const response = {};
                (geometry.index && (response.index = geometry.index.array),
                  geometry.bones && (response.bones = geometry.bones),
                  geometry.attributes.forEach((att) => {
                    ((response[att.name] = att.array),
                      (response[`${att.name}ItemSize`] = att.itemSize));
                  }),
                  response.position && computeBounding(response),
                  resolve(response, id, buffers));
              } catch (error) {
                onError({
                  message: message,
                  er: `Parsing error on Draco file ${message.path}.`,
                  resolve: resolve,
                  id: id,
                });
              } finally {
                draco.destroy(decoder);
              }
            });
          })(message.buffer, message.dataAttrib);
          break;
        case "decodeBundle":
          fetchAndDecodeDracoBundle(message, id).catch((error) => {
            onError({
              message: message,
              er: `Error decoding draco bundle ${message.path}: ${error.message}`,
              resolve: resolve,
              id: id,
            });
          });
          break;
        case "decode":
          fetchAndDecodeDraco(message, id).catch((error) => {
            onError({
              message: message,
              er: `Error decoding draco file ${message.path}: ${error.message}`,
              resolve: resolve,
              id: id,
            });
          });
          break;
        case "decodeSkinAnimation":
          fetchAndDecodeDracoSkinAnimation(message, id).catch((error) => {
            onError({
              message: message,
              er: `Error decoding draco skin animation ${message.path}: ${error.message}`,
              resolve: resolve,
              id: id,
            });
          });
      }
    }),
      (this.decodeGeometry = decodeGeometry),
      (this.decodeIndex = decodeIndex),
      (this.decodeAttribute = decodeAttribute),
      (this.getDracoDataType = getDracoDataType),
      (this.onError = onError),
      (this.readJsonHeader = readJsonHeader),
      (this.fetchAndDecodeDracoBundle = fetchAndDecodeDracoBundle),
      (this.fetchAndDecodeDraco = fetchAndDecodeDraco),
      (this.fetchAndDecodeDracoSkinAnimation =
        fetchAndDecodeDracoSkinAnimation),
      (this.decodeDracoBuffer = decodeDracoBuffer));
  }