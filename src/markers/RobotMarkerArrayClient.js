/**
 * @author Ellis Ratner
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
      for(var i = 0; i < message.markers.length; ++i) {
	var newMarker = new ROS3D.Marker({
          message : message.markers[i],
          path : that.path
	});

	var sceneNode = new ROS3D.SceneNode({
          frameID : message.markers[i].header.frame_id,
          tfClient : that.tfClient,
          object : newMarker
	});

	that.rootObject.add(sceneNode);
	that.currentMarkers.push(sceneNode);
      }
    } else {
      if(message.markers.length > that.currentMarkers) {
	console.error('Too many markers in the latest message!');
      } else {
	for(var j = 0; j < message.markers.length; ++j) {
          that.currentMarkers[j].object.position.x = message.markers[j].pose.position.x;
          that.currentMarkers[j].object.position.y = message.markers[j].pose.position.y;
          that.currentMarkers[j].object.position.z = message.markers[j].pose.position.z;
          that.currentMarkers[j].object.orientation = new THREE.Quaternion(
            message.markers[j].pose.orientation.x,
            message.markers[j].pose.orientation.y,
            message.markers[j].pose.orientation.z,
            message.markers[j].pose.orientation.w
          );
	}
      }
    }
    that.emit('change');
  });
};
ROS3D.RobotMarkerArrayClient.prototype.__proto__ = EventEmitter2.prototype;