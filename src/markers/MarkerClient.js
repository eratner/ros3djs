/**
 * @author Russell Toris - rctoris@wpi.edu
 */

/**
 * A marker client that listens to a given marker topic.
 *
 * Emits the following events:
 *
 *  * 'change' - there was an update or change in the marker
 *
 * @constructor
 * @param options - object with following keys:
 *
 *   * ros - the ROSLIB.Ros connection handle
 *   * topic - the marker topic to listen to
 *   * tfClient - the TF client handle to use
 *   * rootObject (optional) - the root object to add this marker to
 *   * path (optional) - the base path to any meshes that will be loaded
 *   * loader (optional) - the Collada loader to use (e.g., an instance of ROS3D.COLLADA_LOADER
 *                         ROS3D.COLLADA_LOADER_2) -- defaults to ROS3D.COLLADA_LOADER_2
 */
ROS3D.MarkerClient = function(options) {
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

    // subscribe to the topic
    var rosTopic = new ROSLIB.Topic({
                                        ros : ros,
                                        name : topic,
                                        messageType : 'visualization_msgs/Marker',
                                        compression : 'png'
                                    });
    rosTopic.subscribe(function(message) {
                           if(that.markers[message.ns + message.id] && message.action === 2) {
                               // A marker with this ID and namespace already exists; delete it
                               that.rootObject.remove(that.markers[message.ns + message.id]);
                               delete that.markers[message.ns + message.id];
                               that.emit('change');
                           } else {
                               if(that.markers[message.ns + message.id]) {
                                   // If the marker already exists, update the pose
                                   that.markers[message.ns + message.id].children[0].position = new THREE.Vector3(
                                               message.pose.position.x,
                                               message.pose.position.y,
                                               message.pose.position.z
                                               );
                                   that.markers[message.ns + message.id].children[0].quaternion = new THREE.Quaternion(
                                               message.pose.orientation.x,
                                               message.pose.orientation.y,
                                               message.pose.orientation.z,
                                               message.pose.orientation.w
                                               );
                                   that.emit('change');
                               } else {
                                   if(message.action === 2) {
                                       // Marker does not exist, but has been requested to be deleted
                                       return;
                                   }
                                   // Otherwise, add it to the scene
                                   var newMarker = new ROS3D.Marker({
                                                                        message : message,
                                                                        path : that.path,
                                                                        loader : that.loader
                                                                    });
                                   that.markers[message.ns + message.id] = new ROS3D.SceneNode({
                                                                                                   frameID : message.header.frame_id,
                                                                                                   tfClient : that.tfClient,
                                                                                                   object : newMarker
                                                                                               });
                                   that.rootObject.add(that.markers[message.ns + message.id]);

                                   // If the marker has a timeout, delete when necessary
                                   if(parseInt(message.lifetime.secs, 10) !== 0) {
                                       var lifetime = parseInt(message.lifetime.secs, 10);
                                       if(lifetime > 0) {
                                           var removeMarker = window.setInterval(function() {
                                                                                     console.log('Time\'s up! removing marker');
                                                                                     that.rootObject.remove(that.markers[message.ns + message.id]);
                                                                                     delete that.markers[message.ns + message.id];
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
