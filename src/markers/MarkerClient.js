/**
 * @author Russell Toris - rctoris@wpi.edu
 * @author Ellis Ratner - eratner@bowdoin.edu
 */

/**
 * A marker client that listens to a given marker topic.
 *
 * Emits the following events:
 *  * 'change' - there was an update or change in the markers
 *
 * @constructor
 * @param options - object with following keys:
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic - the marker topic to listen to
 *   * tfClient - the TF client handle to use
 *   * rootObject (optional) - the root object to add markers to
 */
ROS3D.MarkerClient = function(options) {
  var that = this;
  options = options || {};
  var ros = options.ros;
  var topic = options.topic;
  this.tfClient = options.tfClient;
  this.rootObject = options.rootObject || new THREE.Object3D();

  // a dictionary of the currently displayed markers
  this.currentMarkers = [];

  // subscribe to the topic
  var rosTopic = new ROSLIB.Topic({
    ros : ros,
    name : topic,
    messageType : 'visualization_msgs/Marker',
    compression : 'png'
  });
  rosTopic.subscribe(function(message) {
    if(that.currentMarkers[[message.ns, message.id]] && message.action === 2) {
      // a marker with this id and namespace already exists; delete it.
      //console.log('deleting marker with namespace\'' + message.ns + '\' and id ' + message.id + '.');
      that.rootObject.remove(that.currentMarkers[[message.ns, message.id]]);
      that.currentMarkers[[message.ns, message.id]] = null;
      delete that.currentMarkers[[message.ns, message.id]];
      that.emit('change');
    } else {
      if(that.currentMarkers[[message.ns, message.id]]) {
	// if the marker already exists, update the pose
	//console.log('marker ' + message.id + ' already exists; updating its pose.');
        that.currentMarkers[[message.ns, message.id]].children[0].position = new THREE.Vector3(
          message.pose.position.x,
          message.pose.position.y,
          message.pose.position.z
        );
        that.currentMarkers[[message.ns, message.id]].children[0].quaternion = new THREE.Quaternion(
          message.pose.orientation.x,
          message.pose.orientation.y,
          message.pose.orientation.z,
          message.pose.orientation.w
        );
	that.emit('change');
      } else {
	if(message.action === 2) {
          //console.log('does not exist, but action is delete');
          return;
	}
	// otherwise, add it to the scene
	//console.log('adding new marker ' + message.id + '.');
	var newMarker = new ROS3D.Marker({
          message : message
	});
	var node = new ROS3D.SceneNode({
          frameID : message.header.frame_id,
          tfClient : that.tfClient,
          object : newMarker
	});
	that.currentMarkers[[message.ns, message.id]] = node;
        that.rootObject.add(node);

	//console.log('NUM MARKERS = ' + Object.keys(that.currentMarkers).length);

	// If the marker has a timeout, delete when necessary
	if(parseInt(message.lifetime.secs, 10) !== 0) {
          var lifetime = parseInt(message.lifetime.secs, 10);
          //console.log('Lifetime: ' + lifetime);
          if(lifetime > 0) {
            // console.log('Removing marker after lifetime ' +
            //             lifetime);
              var removeMarker = window.setInterval(function() {
              console.log('Time\'s up! removing marker');
              that.rootObject.remove(that.currentMarkers[[message.ns, message.id]]);
              that.currentMarkers[[message.ns, message.id]] = null;
              delete that.currentMarkers[[message.ns, message.id]];
              that.emit('change');
              clearInterval(removeMarker);
            }, lifetime);
          } else {
            console.log('Error: marker has invalid lifetime ' +
                        lifetime);
          }
	}

	that.emit('change');
      }
    }
  });
};
ROS3D.MarkerClient.prototype.__proto__ = EventEmitter2.prototype;
