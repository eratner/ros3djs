/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Nils Berg - berg.nils@gmail.com
 */

/**
 * A MarkerArray client that listens to a given topic.
 *
 * Emits the following events:
 *
 *  * 'change' - there was an update or change in the MarkerArray
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic - the marker topic to listen to
 *   * tfClient - the TF client handle to use
 *   * rootObject (optional) - the root object to add the markers to
 *   * path (optional) - the base path to any meshes that will be loaded
 *   * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER
 *                         ROS3D.COLLADA_LOADER_2) -- defaults to ROS3D.COLLADA_LOADER_2
 */
ROS3D.MarkerArrayClient = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var topic = options.topic;
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();
  this.path = options.path || '/';
  this.loader = options.loader || ROS3D.COLLADA_LOADER_2;

  // Markers that are displayed (Map ns+id--Marker)
  this.markers = {};

  // subscribe to MarkerArray topic
  var arrayTopic = new ROSLIB.Topic({
    ros : ros,
    name : topic,
    messageType : 'visualization_msgs/MarkerArray',
    compression : 'png'
  });

  arrayTopic.subscribe(function(message) {
    // Process each marker in the marker array message
    message.markers.forEach(function(marker) {
      switch(marker.action) {
      case 0: // ADD
        // Marker already exists, so update its properties
        if(that.markers[marker.ns + marker.id]) {
          //console.log('[mac] updating marker with id ' + marker.id.toString() + ' and namespace ' + marker.ns);
          // Update the pose
          that.markers[marker.ns + marker.id].children[0].position = new THREE.Vector3(
            marker.pose.position.x,
            marker.pose.position.y,
            marker.pose.position.z
          );
          that.markers[marker.ns + marker.id].children[0].quaternion = new THREE.Quaternion(
            marker.pose.orientation.x,
            marker.pose.orientation.y,
            marker.pose.orientation.z,
            marker.pose.orientation.w
          );
          // @todo update other relevant properties
	} else {
          //console.log('[mac] adding marker with id ' + marker.id.toString() + ' and namespace ' + marker.ns);
          // Marker does not exist, so add it
          var newMarker = new ROS3D.Marker({
            message : marker,
            path : that.path,
            loader : that.loader
          });
            that.markers[marker.ns + marker.id] = new ROS3D.SceneNode({
            frameID : marker.header.frame_id,
            tfClient : that.tfClient,
            object : newMarker
          });
          that.rootObject.add(that.markers[marker.ns + marker.id]);
        }
	break;
      case 1: // MODIFY
	// @todo deprecated?
	break;
      case 2: // DELETE
	// Can only delete it if it exists already
    if(that.markers[marker.ns + marker.id]) {
          //console.log('[mac] deleting marker with id ' + marker.id.toString() + ' and namespace ' + marker.ns);
          //dispose object properly (http://stackoverflow.com/questions/14650716/deallocating-object3d)
          var currentNode = that.markers[marker.ns + marker.id];
          currentNode.traverse(function(child) {
            if (child.geometry !== undefined) {
              child.geometry.dispose();
              //child.material.dispose(); //no need for this since material is shared among other objects
            }
          });
          currentNode.unsubscribe();
          that.rootObject.remove(currentNode);
          that.markers[marker.ns + marker.id] = null;
          delete that.markers[marker.ns + marker.id];
        }
        break;
      }
    });

    that.emit('change');
  });
};
ROS3D.MarkerArrayClient.prototype.__proto__ = EventEmitter2.prototype;
