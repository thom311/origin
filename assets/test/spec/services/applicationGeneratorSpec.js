"use strict";

describe("ApplicationGenerator", function(){
  var ApplicationGenerator;
  var input;
  
  beforeEach(function(){
    module('openshiftConsole', function($provide){
      $provide.value("DataService",{
        osApiVersion: "v1beta1",
        k8sApiVersion: "v1beta3"
      });
    });
    
    inject(function(_ApplicationGenerator_){
      ApplicationGenerator = _ApplicationGenerator_;
      ApplicationGenerator._generateSecret = function(){
        return "secret101";
      };
    });

    input = {
      name: "ruby-hello-world",
      routing: true,
      buildConfig: {
        sourceUrl: "https://github.com/openshift/ruby-hello-world.git",
        buildOnSourceChange: true,
        buildOnImageChange: true
      },
      deploymentConfig: {
        deployOnConfigChange: true,
        deployOnNewImage: true,
        envVars: {
          "ADMIN_USERNAME" : "adminEME",
          "ADMIN_PASSWORD" : "xFSkebip",
          "MYSQL_ROOT_PASSWORD" : "qX6JGmjX",
          "MYSQL_DATABASE" : "root"
        }
      },
      labels : {
        foo: "bar",
        abc: "xyz"
      },
      scaling: {
        replicas: 1
      },
      imageName: "origin-ruby-sample",
      imageTag: "latest", 
      imageRepo: {
    	    "kind": "ImageRepository",
    	    "apiVersion": "v1beta1",
    	    "metadata": {
    	        "name": "origin-ruby-sample",
    	        "namespace": "test",
    	        "selfLink": "/osapi/v1beta1/imageRepositories/origin-ruby-sample?namespace=test",
    	        "uid": "ea1d67fc-c358-11e4-90e6-080027c5bfa9",
    	        "resourceVersion": "150",
    	        "creationTimestamp": "2015-03-05T16:58:58Z"
    	    },
    	    "tags": {
    	        "latest": "ea15999fd97b2f1bafffd615697ef8c14abdfd9ab17ff4ed67cf5857fec8d6c0"
    	    },
    	    "status": {
    	        "dockerImageRepository": "172.30.17.58:5000/test/origin-ruby-sample"
    	    }
    	},
      image: {
        "kind" : "Image",
        "metadata" : {
          "name" : "ea15999fd97b2f1bafffd615697ef8c14abdfd9ab17ff4ed67cf5857fec8d6c0"
        },
        "dockerImageMetadata" : {
          "ContainerConfig" : {
            "ExposedPorts": {
              "443/tcp": {},
              "80/tcp": {}
            },
            "Env": [
              "STI_SCRIPTS_URL"
            ]
          }
        }
      }
    };
  });
  
  describe("#_generateService", function(){
    it("should generate a headless service when no ports are exposed", function(){
      var copy = angular.copy(input);
      copy.image.dockerImageMetadata.ContainerConfig.ExposedPorts = {};
      var service = ApplicationGenerator._generateService(copy, "theServiceName", "None");
      expect(service).toEqual(        
        {
            "kind": "Service",
            "apiVersion": "v1beta3",
            "metadata": {
                "name": "theServiceName",
                "labels" : {
                  "foo" : "bar",
                  "abc" : "xyz"                }
            },
            "spec": {
                "portalIP" : "None",
                "selector": {
                    "deploymentconfig": "ruby-hello-world"
                }
            }
        });
    });
  });
  
  describe("#_generateRoute", function(){
    
    it("should generate nothing if routing is not required", function(){
      input.routing = false;
      expect(ApplicationGenerator._generateRoute(input, input.name, "theServiceName")).toBe(null);
    });
    
    it("should generate an unsecure Route when routing is required", function(){
      var route = ApplicationGenerator._generateRoute(input, input.name, "theServiceName");
      expect(route).toEqual({
        kind: "Route",
        apiVersion: 'v1beta1',
        metadata: {
          name: "ruby-hello-world",
          labels : {
            "foo" : "bar",
            "abc" : "xyz"
          }
        },
        serviceName: "theServiceName"
      });
    });
  });
  
  describe("generating applications from image that includes source", function(){
    var resources;
    beforeEach(function(){
      resources = ApplicationGenerator.generate(input);
    });
    
    it("should generate a BuildConfig for the source", function(){
      expect(resources.buildConfig).toEqual(
        {
            "apiVersion": "v1beta1",
            "kind": "BuildConfig",
            "metadata": {
                "name": "ruby-hello-world",
                labels : {
                  "foo" : "bar",
                  "abc" : "xyz",
                  "name": "ruby-hello-world",
                  "generatedby": "OpenShiftWebConsole"
                }
            },
            "parameters": {
                "output": {
                    "to": {
                        "name": "ruby-hello-world"
                    }
                },
                "source": {
                    "git": {
                        "ref": "master",
                        "uri": "https://github.com/openshift/ruby-hello-world.git"
                    },
                    "type": "Git"
                },
                "strategy": {
                    "type": "STI",
                    "stiStrategy" : {
                      "image" : "172.30.17.58:5000/test/origin-ruby-sample:latest"
                    }
                }
            },
            "triggers": [
                {
                    "generic": {
                        "secret": "secret101"
                    },
                    "type": "generic"
                },
                {
                    "github": {
                        "secret": "secret101"
                    },
                    "type": "github"
                },
                {
                  "imageChange" : {
                    "image" : "172.30.17.58:5000/test/origin-ruby-sample:latest",
                    "from" : {
                      "name" : "origin-ruby-sample"
                    },
                    "tag" : "latest"
                  },
                  "type" : "imageChange"
                }
            ]

          }
      );
    });
    
    it("should generate an ImageRepository for the build output", function(){
      expect(resources.imageRepo).toEqual(
        {
          "apiVersion": "v1beta1",
          "kind": "ImageRepository",
          "metadata": {
              "name": "ruby-hello-world",
              labels : {
                "foo" : "bar",
                "abc" : "xyz",
                "name": "ruby-hello-world",
                "generatedby": "OpenShiftWebConsole"
              }
          }
        }
      );
    });
    
    it("should generate a Service for the build output", function(){
      expect(resources.service).toEqual(
        {
            "kind": "Service",
            "apiVersion": "v1beta3",
            "metadata": {
                "name": "ruby-hello-world",
                "labels" : {
                  "foo" : "bar",
                  "abc" : "xyz",
                  "name": "ruby-hello-world",
                  "generatedby": "OpenShiftWebConsole"
                }
            },
            "spec": {
                "ports": [{
                  "port": 80,
                  "targetPort" : 80,
                  "protocol": "tcp"
                }],
                "selector": {
                    "deploymentconfig": "ruby-hello-world"
                }
            }
        }
      );
    });
    
    it("should generate a DeploymentConfig for the BuildConfig output image", function(){
      var resources = ApplicationGenerator.generate(input);
      expect(resources.deploymentConfig).toEqual(
        {
            "apiVersion": "v1beta1",
            "kind": "DeploymentConfig",
            "metadata": {
                "name": "ruby-hello-world",
                "labels": {
                    "foo" : "bar",
                    "abc" : "xyz",
                    "name": "ruby-hello-world",
                    "generatedby" : "OpenShiftWebConsole",
                    "deploymentconfig": "ruby-hello-world"
                  }
            },
            "template": {
                "controllerTemplate": {
                    "podTemplate": {
                        "desiredState": {
                            "manifest": {
                                "containers": [
                                    {
                                        "image": "ruby-hello-world:latest",
                                        "name": "ruby-hello-world",
                                        "ports": [
                                            {
                                                "containerPort": 443,
                                                "name": "ruby-hello-world-tcp-443",
                                                "protocol": "tcp"
                                            },
                                            {
                                                "containerPort": 80,
                                                "name": "ruby-hello-world-tcp-80",
                                                "protocol": "tcp"
                                            }
                                        ],
                                        "env" : [
                                          {
                                            "name": "ADMIN_USERNAME",
                                            "value": "adminEME"
                                          },
                                          {
                                            "name": "ADMIN_PASSWORD",
                                            "value": "xFSkebip"
                                          },
                                          {
                                            "name": "MYSQL_ROOT_PASSWORD",
                                            "value": "qX6JGmjX"
                                          },
                                          {
                                            "name": "MYSQL_DATABASE",
                                            "value": "root"
                                          }
                                        ]
                                    }
                                ],
                                "version": "v1beta3"
                            }
                        },
                        "labels": {
                            "foo" : "bar",
                            "abc" : "xyz",
                            "name": "ruby-hello-world",
                            "generatedby" : "OpenShiftWebConsole",
                            "deploymentconfig": "ruby-hello-world"
                          }
                    },
                    "replicaSelector": {
                        "deploymentconfig": "ruby-hello-world"
                    },
                    "replicas": 1
                },
                "strategy": {
                    "type": "Recreate"
                }
            },
            "triggers": [
                {
                    "type": "ImageChange",
                    "imageChangeParams": {
                        "automatic": true,
                        "containerNames": [
                            "ruby-hello-world"
                        ],
                        "from": {
                            "name": "ruby-hello-world"
                        },
                        "tag": "latest"
                    }
                },
                {
                    "type": "ConfigChange"
                }
            ]
        }
      );
    });
    
  });
 
});
