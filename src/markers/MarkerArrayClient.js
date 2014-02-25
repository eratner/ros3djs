/**
 * @author Ellis Ratner - ellis.ratner@gmail.com
 */

/**
 * A marker array client that listens to a given marker array topic.
 *
 * Emits the following events:
 *  * 'change' - there was an update or change to one of the markers
 *
 * @param options - object with the following keys:
 *  * ros
 *  * tfClient
 *  * topic
 *  * path (optional)
 *  * rootObject (optional)
 */
ROS3D.MarkerArrayClient = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var topic = options.topic;
  this.path = options.path || '/';
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();

  this.currentMarkers = [];

  var rosTopic = new ROSLIB.Topic({
    ros : ros,
    name : topic,
    messageType : 'visualization_msgs/MarkerArray',
    compression : 'png'
  });

  rosTopic.subscribe(function(message) {
    // Process each marker in the marker array message
    message.markers.forEach(function(marker) {
      switch(marker.action) {
      case 0: // ADD
        // Marker already exists, so update its properties
        if(that.currentMarkers[[marker.ns, marker.id]]) {
          //console.log('[mac] updating marker with id ' + marker.id.toString() + ' and namespace ' + marker.ns);
          // Update the pose
          that.currentMarkers[[marker.ns, marker.id]].children[0].position = new THREE.Vector3(
            marker.pose.position.x,
            marker.pose.position.y,
            marker.pose.position.z
          );
          that.currentMarkers[[marker.ns, marker.id]].children[0].quaternion = new THREE.Quaternion(
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
            path : that.path
          });
          var node = new ROS3D.SceneNode({
            frameID : marker.header.frame_id,
            tfClient : that.tfClient,
            object : newMarker
          });
          that.currentMarkers[[marker.ns, marker.id]] = node;
          that.rootObject.add(node);
        }
	break;
      case 1: // MODIFY
	// @todo deprecated?
	break;
      case 2: // DELETE
	// Can only delete it if it exists already
	if(that.currentMarkers[[marker.ns, marker.id]]) {
          //console.log('[mac] deleting marker with id ' + marker.id.toString() + ' and namespace ' + marker.ns);
          that.rootObject.remove(that.currentMarkers[[marker.ns, marker.id]]);
          that.currentMarkers[[marker.ns, marker.id]] = null;
          delete that.currentMarkers[[marker.ns, marker.id]];
        }
        break;
      }
    });
    that.emit('change');
  });
};
ROS3D.MarkerArrayClient.prototype.__proto__ = EventEmitter2.prototype;
