/**
 * @file index
 * @author dujianhao
 * @date 2019-04-18
 **/

// 模拟影院位置数据(1为座位，0为过道)
const EMPTY_SEAT_LOCATION = [
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    ];

// 影院被选位置数据(1为已选，0为未选)
const TAKEN_SEAT_LOCATION = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0]
];

const EMPTY_SEAT_IMG_URL = './img/seat_empty.png';
const TAKEN_SEAT_IMG_URL = './img/seat_taken.png';

const isTouchSupported = 'ontouchend' in document;

function setSeatText(text) {
    const selectedSeatElement = document.getElementById('selectedSeat');
    selectedSeatElement.textContent = text;
}
/**
 * 加载图片，超时5s则直接返回
 * @param url
 * @return {Object}
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const loadTimeout = setTimeout(
            function () {
                image.onload = null;
                reject('image load timeout');
            },
            5000
        );

        image.onload = function () {
            clearTimeout(loadTimeout);
            resolve(image);
        };

        image.crossOrigin = 'anonymous';
        image.src = url;
    });
}

class CinemaSeat {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        // 此处获取的为canvas在HTML中的大小及位置，与canvas.width和canvas.height不一样。HTML中设为2倍的关系以针对iphone等高分屏优化细节
        this.canvasPosition = canvas.getBoundingClientRect();
    }

    async init() {
        try {
            this.emptyImg = await loadImage(EMPTY_SEAT_IMG_URL);
            this.takenImg = await loadImage(TAKEN_SEAT_IMG_URL);
            this.getDefaultSeatInfo();
            this.restoreDefaultSeats();
            this.addEventListener();
            // 用户选座的位置
            this.mySelections = [];
        }
        catch (e) {
            throw new Error(e);
        }
    }

    get selections() {
        return this.mySelections;
    }

    getDefaultSeatInfo() {
        // 假装有HTTP请求
        const emptySeatLocation = EMPTY_SEAT_LOCATION;
        const takenSeatLocation = TAKEN_SEAT_LOCATION;

        if (!emptySeatLocation || !emptySeatLocation.length || !takenSeatLocation || !takenSeatLocation.length) {
            throw new Error('seat data error');
        }

        const row = emptySeatLocation.length;
        const column = emptySeatLocation[0].length;

        const takenSeatRow = takenSeatLocation.length;
        const takenSeatColumn = takenSeatLocation[0].length;
        // 座椅数据不一致，报错
        if (column !== takenSeatColumn || row !== takenSeatRow) {
            throw new Error('seat data error');
        }

        this.seatWidth = this.canvasWidth / column;
        this.seatHeight = this.canvasHeight / row;
        this.column = column;
        this.row = row;
        this.emptySeatLocation = emptySeatLocation;
        this.takenSeatLocation = takenSeatLocation;
    }

    restoreDefaultSeats() {
        const { canvasWidth, canvasHeight, seatWidth, seatHeight, column, row, emptySeatLocation, takenSeatLocation } = this;

        if (!this.defaultSeatImgData) {
            // 新建一个临时canvas绘制出所有空座椅并导出为imageData供下次直接绘制
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvasWidth;
            tempCanvas.height = canvasHeight;
            const tempCtx = tempCanvas.getContext('2d');

            for (let i = 0; i < row; i++) {
                for (let j = 0; j < column; j++) {
                    const dx = seatWidth * j;
                    const dy = seatHeight * i;
                    // 当前为空座椅
                    if (emptySeatLocation[i][j] && !takenSeatLocation[i][j]) {
                        tempCtx.drawImage(this.emptyImg, dx, dy, seatWidth, seatHeight);
                    }
                    // 当前被选座椅
                    if (takenSeatLocation[i][j]) {
                        tempCtx.drawImage(this.takenImg, dx, dy, seatWidth, seatHeight);
                    }

                    // 绘制座位排index
                    if (j === 0) {
                        const text = `${i + 1}-${j + 1}`;
                        tempCtx.font = '24px sans-serif';
                        tempCtx.fillStyle = '#bfbfbf';
                        tempCtx.fontWeight = 'bold';
                        const textWidth = tempCtx.measureText(text).width;
                        tempCtx.fillText(i + 1, (seatWidth - textWidth / 2) / 2, dy + (seatHeight - textWidth / 2) / 2)
                    }
                }
            }
            // 将空座位所有数据保存，第二次重绘时只需绘制一次
            this.defaultSeatImgData = tempCtx.getImageData(0, 0, canvasWidth, canvasHeight);
        }
        this.context.putImageData(this.defaultSeatImgData, 0, 0);
    }

    toggleSeat({ x, y }) {
        const { canvasWidth, canvasHeight, seatWidth, seatHeight, column, row, emptySeatLocation, takenSeatLocation } = this;

        // 越界退出
        if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) {
            return;
        }

        const rowNumber = Math.floor(y / seatHeight);
        const columnNumber = Math.floor(x / seatWidth);
        // 走道数
        const columnPathCount = emptySeatLocation[rowNumber].filter((item, index) => !item && index < columnNumber).length;

        // 点击到过道
        if (!emptySeatLocation[rowNumber][columnNumber]) {
            return;
        }
        // 点击到已被选位置
        if (!emptySeatLocation[rowNumber][columnNumber] || takenSeatLocation[rowNumber][columnNumber]) {
            setSeatText('座位已被选哦, 请选空余座位');
            return;
        }
        const selection = rowNumber + '-' + columnNumber;
        const index = this.mySelections.indexOf(selection);

        if (~index) {
            // 之前已选，此次则取消选择
            this.mySelections.splice(index, 1);
            this.drawSeat({
                isEmpty: true,
                rowNumber,
                columnNumber
            });
            setTimeout(() => {
                setSeatText(`取消座位：${rowNumber + 1}排${columnNumber + 1 - columnPathCount}座`);
            });
        }
        else {
            // 未选择则添加
            this.mySelections.push(selection);
            this.drawSeat({
                isEmpty: false,
                rowNumber,
                columnNumber
            });
            setTimeout(() => {
                setSeatText(`选择座位：${rowNumber + 1}排${columnNumber + 1 - columnPathCount}座`);
            });
        }
    }

    drawSeat({ isEmpty, rowNumber, columnNumber }) {
        const { context, seatWidth, seatHeight } = this;

        const img = isEmpty ? this.emptyImg : this.takenImg;

        context.drawImage(img, seatWidth * columnNumber, seatHeight * rowNumber, seatWidth, seatHeight);
    }

    /**
     * 页面大小改变时更新尺寸信息
     */
    updateSize() {
        const { canvas, column, row } = this;

        this.canvasWidth = canvas.width;
        this.canvasHeight = canvas.height;
        // 此处获取的为canvas在HTML中的大小及位置，与canvas.width和canvas.height不一样。HTML中设为2倍的关系以针对iphone等高分屏优化细节
        this.canvasPosition = canvas.getBoundingClientRect();
        this.seatWidth = this.canvasWidth / column;
        this.seatHeight = this.canvasHeight / row;
    }

    /**
     * 触摸设备的TouchEvent的坐标信息存放位置与MouseEvent不一样
     * @param e
     * @return {*}
     */
    static getPointPosition (e) {
        if (isTouchSupported) {
            return e.changedTouches[0];
        }
        return e;
    }

    addEventListener() {
        this.clickListener = e => {
            const { pageX, pageY } = CinemaSeat.getPointPosition(e);
            // 触摸事件通过touchend与touchstart的距离来确定是否为点击事件
            if (isTouchSupported) {
                // 触摸前后移动位置过大，忽略此次点击
                if (Math.abs(this.mouseDownPosition.pageX -pageX) > 10
                    || Math.abs(this.mouseDownPosition.pageY -pageY) > 10) {
                    return;
                }
                this.mouseDownPosition = {};
            }
            const { canvasWidth, canvasHeight, canvasPosition } = this;
            const x = pageX - canvasPosition.x;
            const y = pageY - canvasPosition.y;
            // 将HTML坐标值转化为canvas内的坐标值
            const ratioX = canvasWidth / canvasPosition.width;
            const ratioY = canvasHeight / canvasPosition.height;
            const clickPosition = {
                x: x * ratioX,
                y: y * ratioY
            };
            this.toggleSeat(clickPosition);

        };

        this.mouseDownListener = e => {
            this.mouseDownPosition = CinemaSeat.getPointPosition(e);
        };

        this.resizeListener = () => {
            this.updateSize();
        };

        if (isTouchSupported) {
            document.addEventListener('touchend', this.clickListener);
            document.addEventListener('touchstart', this.mouseDownListener);
        }
        else {
            document.addEventListener('click', this.clickListener);
        }
        window.addEventListener('resize', this.resizeListener);
    }

    removeEventListener() {

        if (isTouchSupported) {
            document.removeEventListener('touchend', this.clickListener);
            document.removeEventListener('touchstart', this.mouseDownListener);
        }
        else {
            document.removeEventListener('click', this.clickListener);
        }
        window.removeEventListener('resize', this.resizeListener);
    }

    destroy() {
        this.canvas = null;
        this.context = null;
        this.removeEventListener();
    }
}


const canvas = document.getElementById('myCanvas');
const cinemaSeat = new CinemaSeat(canvas);
cinemaSeat.init();