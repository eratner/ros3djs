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
ROS3D.RobotMarkerArrayClient = function(options) {
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
    if(that.currentMarkers.length === 0) {
      var newMarker = null;
      var newSceneNode = null;

      for(var j = 0; j < message.markers.length; ++j) {
        newMarker = new ROS3D.Marker({
          message : message.markers[j],
          path : that.path
        });

        newSceneNode = new ROS3D.SceneNode({
          frameID : message.markers[j].header.frame_id,
          tfClient : that.tfClient,
          object : newMarker
        });

        that.currentMarkers.push(newSceneNode);
        that.rootObject.add(newSceneNode);
      }
    } else {
      if(message.markers.length > that.currentMarkers.length) {
        console.error('Incoming message has too many markers!');
      } else {
        for(var k = 0; k < that.currentMarkers.length; ++k) {
         that.currentMarkers[k].children[0].position = new THREE.Vector3(
            message.markers[k].pose.position.x,
            message.markers[k].pose.position.y,
            message.markers[k].pose.position.z
          );
          that.currentMarkers[k].children[0].quaternion = new THREE.Quaternion(
            message.markers[k].pose.orientation.x,
            message.markers[k].pose.orientation.y,
            message.markers[k].pose.orientation.z,
            message.markers[k].pose.orientation.w
          );
	}
      }
    }
    that.emit('change');
  });
};
ROS3D.RobotMarkerArrayClient.prototype.__proto__ = EventEmitter2.prototype;