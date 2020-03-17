//@ts-check
//Declare globalVariables
let canvas, context2D;

//The physicsEngine calculates motionVariables (i.e. s, v) based on passed time between two frames
//Therefore it is required to keep track of time when the last frame was rendered
let lastTime = new Date().getTime();
let animationFrameRequestId = null;

const globalMotion = {
    accelerometer: new Accelerometer({ frequency: 16 }),
    accelerationScale: 500,
    xAcceleration: 0,
    yAcceleration: 0,
};

const objects = [];

function main() {
    //Register the service worker
    navigator.serviceWorker.register("../serviceWorker.js");

    //Add onpointerdown to navigationControl for execute different procedures
    const navigationControl = document.getElementById("navigationControl");
    navigationControl.addEventListener("click", () => {
        if (animationFrameRequestId) {
            cancelAnimationFrame(animationFrameRequestId);
            animationFrameRequestId = null;
            globalMotion.accelerometer.stop();
        } else {
            animationFrameRequestId = requestAnimationFrame(animateObjects);
            globalMotion.accelerometer.start();
        }
    });
    navigationControl.addEventListener("touchstart", startNavigation);
    navigationControl.addEventListener("mousedown", startNavigation);

    //Initialize global variables
    canvas = document.getElementById("canvas");
    context2D = canvas.getContext("2d");
    
    //Cache elements for event listeners
    const xVelocityContainer = document.getElementById("xVelocity");
    const yVelocityContainer = document.getElementById("yVelocity");
    const elasticConstantContainer = document.getElementById("elasticConstant");
    const radiusContainer = document.getElementById("radius");
    const realTimeAccelerationContainer = document.getElementById("realTimeAcceleration");
    const customXAccelerationContainer = document.getElementById("customXAcceleration");
    const customYAccelerationContainer = document.getElementById("customYAcceleration");
    const accelerationScaleContainer = document.getElementById("accelerationScale");

    //Add eventListeners
    window.addEventListener("resize", setViewport);

    //Access accelerometer using generic sensors API (can define polling rate)
    globalMotion.accelerometer.onreading = () => {
        globalMotion.xAcceleration = -globalMotion.accelerometer.x * globalMotion.accelerationScale;
        globalMotion.yAcceleration = globalMotion.accelerometer.y * globalMotion.accelerationScale;
    };

    document.getElementById("addObject").addEventListener("click", () => {
        const object = {
            xCoordinate: canvas.width / 2,
            yCoordinate: canvas.height / 2,
            xVelocity: parseInt(xVelocityContainer.firstElementChild.value),
            yVelocity: parseInt(yVelocityContainer.firstElementChild.value),
            xDirection: true,
            yDirection: true,
            elasticConstant: parseFloat(elasticConstantContainer.firstElementChild.value),
            radius: parseInt(radiusContainer.firstElementChild.value),
            color: getRandomColor()
        };

        objects.push(object);
    });

    document.getElementById("applyGlobalSettings").addEventListener("click", () => {
        if (realTimeAccelerationContainer.firstElementChild.checked) {
            globalMotion.accelerometer.start();
        } else {
            globalMotion.accelerometer.stop();
        }

        globalMotion.xAcceleration = parseInt(customXAccelerationContainer.firstElementChild.value);
        globalMotion.yAcceleration = parseInt(customYAccelerationContainer.firstElementChild.value);
        globalMotion.accelerationScale = parseInt(accelerationScaleContainer.firstElementChild.value);
    });

    xVelocityContainer.firstElementChild.addEventListener("input", () => {
        xVelocityContainer.children[1].textContent = "X " + xVelocityContainer.firstElementChild.value;
    });
    yVelocityContainer.firstElementChild.addEventListener("input", () => {
        yVelocityContainer.children[1].textContent = "Y " + yVelocityContainer.firstElementChild.value;
    });
    elasticConstantContainer.firstElementChild.addEventListener("input", () => {
        elasticConstantContainer.children[1].textContent = elasticConstantContainer.firstElementChild.value;
    });
    radiusContainer.firstElementChild.addEventListener("input", () => {
        radiusContainer.children[1].textContent = radiusContainer.firstElementChild.value;
    });
    realTimeAccelerationContainer.firstElementChild.addEventListener("input", () => {
        if (realTimeAccelerationContainer.firstElementChild.checked) {
            realTimeAccelerationContainer.children[1].textContent = "Active";
        } else {
            realTimeAccelerationContainer.children[1].textContent = "Inactive";
        }
    });
    customXAccelerationContainer.firstElementChild.addEventListener("input", () => {
        customXAccelerationContainer.children[1].textContent = "X " + customXAccelerationContainer.firstElementChild.value;
    });
    customYAccelerationContainer.firstElementChild.addEventListener("input", () => {
        customYAccelerationContainer.children[1].textContent = "Y " + customYAccelerationContainer.firstElementChild.value;
    });
    accelerationScaleContainer.firstElementChild.addEventListener("input", () => {
        accelerationScaleContainer.children[1].textContent = accelerationScaleContainer.firstElementChild.value;
    });

    //Execute initiation procedure
    setViewport();
}

function setViewport() {
    const canvasBoundingRect = canvas.getBoundingClientRect();
    canvas.height = canvasBoundingRect.height;
    canvas.width = canvasBoundingRect.width;
}

//REAL ENGINE FUNCTIONALITY
function animateObjects() {
    const currentTime = new Date().getTime();
    const timeDifference = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    //Calculate motion for each object and update variables
    for (let i = 0; i < objects.length; i++) {
        calculateHorizontalMotion(timeDifference, objects[i]);
        calculateVerticalMotion(timeDifference, objects[i]);
    }

    //Clear the canvas before rendering
    context2D.clearRect(0, 0, canvas.width, canvas.height);
    //Draw each object on the canvas
    for (let i = 0; i < objects.length; i++) {
        context2D.beginPath();
        context2D.arc(objects[i].xCoordinate, objects[i].yCoordinate, objects[i].radius, 0, 2 * Math.PI);
        context2D.fillStyle = objects[i].color;
        context2D.fill();
    }

    animationFrameRequestId = requestAnimationFrame(animateObjects);
}

function calculateVerticalMotion(timeDifference, object) {
    //After multiplying velocities by elasticConstant several times leads to NaN resulting as the velocity
    //That happens when the velocity is so tiny that it can be considered as 0
    if (isNaN(object.yVelocity)) {
        object.yVelocity = 0;
        object.yMotionAtRest = true;
    } else {
        if (object.yDirection === true) {
            const motionVariables = calculateMotionVariables(object.yVelocity, globalMotion.yAcceleration, timeDifference);
            let newYCoordinate = object.yCoordinate + motionVariables.displacement;
            //This is where the object goes out of bounds at the bottom
            if (newYCoordinate >= canvas.height - object.radius) {
                newYCoordinate = canvas.height - object.radius;
                object.yDirection = false;
                //We don't know the end velocity(v) at the bottom boundary, but we know the displacement(s)
                //And also to get the bounce velocity we have to multiply it with elasticConstant
                object.yVelocity = calculateVelocity(object.yVelocity, globalMotion.yAcceleration, canvas.height - object.radius - object.yCoordinate) * object.elasticConstant;
                //This is where the object reverses its direction due to deceleration in the mid-motion
            } else if (motionVariables.velocity <= 0) {
                //We don't know the displacement(s) to the turning point, but we know the end velocity(v) which is 0
                object.yCoordinate = object.yCoordinate + calculateDisplacement(0, object.yVelocity, globalMotion.yAcceleration);
                object.yVelocity = 0;
                object.yDirection = false;
                //This is for normal motion
            } else {
                //We just need to update the velocity
                object.yVelocity = motionVariables.velocity;
            }
            //Update object's yCoordinate in the object object
            object.yCoordinate = newYCoordinate;
        } else {
            const motionVariables = calculateMotionVariables(object.yVelocity, -globalMotion.yAcceleration, timeDifference);
            let newYCoordinate = object.yCoordinate - motionVariables.displacement;
            //This is where the object goes out of bounds at the top
            if (newYCoordinate <= object.radius) {
                newYCoordinate = object.radius;
                object.yDirection = true;
                object.yVelocity = calculateVelocity(object.yVelocity, -globalMotion.yAcceleration, object.yCoordinate - object.radius) * object.elasticConstant;
                //This is where the object reverses its direction due to deceleration in the mid-motion
            } else if (motionVariables.velocity <= 0) {
                object.yCoordinate = object.yCoordinate + calculateDisplacement(0, object.yVelocity, -globalMotion.yAcceleration);
                object.yVelocity = 0;
                object.yDirection = true;
                //This is for normal motion
            } else {
                object.yVelocity = motionVariables.velocity;
            }
            //Update object's yCoordinate in the object object
            object.yCoordinate = newYCoordinate;
        }
    }
}

function calculateHorizontalMotion(timeDifference, object) {
    if (isNaN(object.xVelocity)) {
        object.xVelocity = 0;
        object.xMotionAtRest = true;
    } else {
        if (object.xDirection === true) {
            const motionVariables = calculateMotionVariables(object.xVelocity, globalMotion.xAcceleration, timeDifference);
            let newXCoordinate = object.xCoordinate + motionVariables.displacement;
            if (newXCoordinate >= canvas.width - object.radius) {
                newXCoordinate = canvas.width - object.radius;
                object.xDirection = false;
                object.xVelocity = calculateVelocity(object.xVelocity, globalMotion.xAcceleration, canvas.width - object.radius - object.xCoordinate) * object.elasticConstant;
            } else if (motionVariables.velocity <= 0) {
                object.xCoordinate = object.xCoordinate + calculateDisplacement(0, object.xVelocity, globalMotion.xAcceleration);
                object.xVelocity = 0;
                object.xDirection = false;
            } else {
                object.xVelocity = motionVariables.velocity;
            }
            object.xCoordinate = newXCoordinate;
        } else {
            const motionVariables = calculateMotionVariables(object.xVelocity, -globalMotion.xAcceleration, timeDifference);
            let newXCoordinate = object.xCoordinate - motionVariables.displacement;
            if (newXCoordinate <= object.radius) {
                newXCoordinate = object.radius;
                object.xDirection = true;
                object.xVelocity = calculateVelocity(object.xVelocity, -globalMotion.xAcceleration, object.xCoordinate - object.radius) * object.elasticConstant;
            } else if (motionVariables.velocity <= 0) {
                object.xCoordinate = object.xCoordinate + calculateDisplacement(0, object.xVelocity, -globalMotion.xAcceleration);
                object.xVelocity = 0;
                object.xDirection = true;
            } else {
                object.xVelocity = motionVariables.velocity;
            }
            object.xCoordinate = newXCoordinate;
        }
    }
}

//EVENT HANDLER METHODS
function startNavigation(event) {
    const navigationControl = event.currentTarget;

    const originalMousePositionX = (event.screenX || event.touches[0].screenX);
    const originalMousePositionY = (event.screenY || event.touches[0].screenY);

    window.parent.addEventListener("touchmove", determineProcedure);
    window.parent.addEventListener("mousemove", determineProcedure);
    window.parent.addEventListener("touchend", executeProcedure);
    window.parent.addEventListener("mouseup", executeProcedure);

    let differenceX = 0;
    let differenceY = 0;
    let procedureToExecute = () => { };

    //INNER EVENT HANDLER FUNCTIONS
    function determineProcedure(event) {
        //Calculate the travelledDistance of the mouse as a vector
        differenceX = (event.screenX || event.touches[0].screenX) - originalMousePositionX;
        differenceY = (event.screenY || event.touches[0].screenY) - originalMousePositionY;

        const absoluteDifferenceX = Math.abs(differenceX);
        const absoluteDifferenceY = Math.abs(differenceY);
        if (absoluteDifferenceX >= absoluteDifferenceY) {
            //Case: x axis must be prioritized
            if (differenceX > 0) {
                navigationControl.style.borderWidth = "0 2px 0 0";
                procedureToExecute = () => {
                    const panel1 = document.getElementById("globalSettingsPanel");
                    const panel2 = document.getElementById("addObjectPanel");
                    if (panel2.classList.contains("panel-popIn")) {
                        panel2.classList.replace("panel-popIn", "panel-popOut");
                    }
                    if (panel1.classList.contains("panel-popIn")) {
                        panel1.classList.replace("panel-popIn", "panel-popOut");
                    } else {
                        panel1.classList.replace("panel-popOut", "panel-popIn");
                    }
                };
            } else if (differenceX < 0) {
                navigationControl.style.borderWidth = "0 0 0 2px";
                procedureToExecute = () => {
                    const panel1 = document.getElementById("addObjectPanel");
                    const panel2 = document.getElementById("globalSettingsPanel");
                    if (panel2.classList.contains("panel-popIn")) {
                        panel2.classList.replace("panel-popIn", "panel-popOut");
                    }
                    if (panel1.classList.contains("panel-popIn")) {
                        panel1.classList.replace("panel-popIn", "panel-popOut");
                    } else {
                        panel1.classList.replace("panel-popOut", "panel-popIn");
                    }
                };
            }
        } else {
            //Case: y axis must be prioritized
            if (differenceY > 0) {
                navigationControl.style.borderWidth = "0 0 2px 0";
                procedureToExecute = () => {
                    objects.length = 0;
                }
            } else if (differenceY < 0) {
                navigationControl.style.borderWidth = "2px 0 0 0";
                procedureToExecute = () => {
                    
                };
            }
        }
    }

    function executeProcedure() {
        procedureToExecute();
        //Remove translation
        navigationControl.removeAttribute("style");
        //Remove all previously added eventListeners
        window.parent.removeEventListener("touchmove", determineProcedure);
        window.parent.removeEventListener("mousemove", determineProcedure);
        window.parent.removeEventListener("touchend", executeProcedure);
        window.parent.removeEventListener("mouseup", executeProcedure);
    }
}

//UTILITY METHODS
function getRandomColor() {
    return `rgb(${Math.floor(Math.random() * (255 - 150 + 1)) + 150}, ${Math.floor(Math.random() * (255 - 150 + 1)) + 150}, ${Math.floor(Math.random() * (255 - 150 + 1)) + 150}`;
}

function calculateMotionVariables(u = 0, a = 10, t = 1) {
    //Calculate displacement
    const s = (u * t) + (1 / 2 * a * t * t);
    //calculate end velocity
    const v = u + (a * t);
    return { displacement: s, velocity: v };
}

function calculateVelocity(u = 0, a = 10, s = 0) {
    return Math.sqrt((u * u) + (2 * a * s));
}

function calculateDisplacement(v = 0, u = 0, a = 10, t = 1) {
    return ((v * v) - (u * u)) / (2 * a);
}