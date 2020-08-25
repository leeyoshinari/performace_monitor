function plot_system(myChart, tables1, tables2, x_label, cpu, mem, IO, disk_r, disk_w, net, rec, trans, tcp, retrans) {
    // 以下是使用快速排序算法排序
    /*let cpu_sorted = quickSort(cpu);
    let IO_sorted = quickSort(IO);
    let disk_r_sorted = quickSort(disk_r);
    let disk_w_sorted = quickSort(disk_w);
    let net_sorted = quickSort(net);
    let rec_sorted = quickSort(rec);
    let trans_sorted = quickSort(trans);*/

    // 以下是使用默认的排序方法，冒泡排序
    let cpu_sorted = [...cpu];
    let IO_sorted = [...IO];
    let disk_r_sorted = [...disk_r];
    let disk_w_sorted = [...disk_w];
    let net_sorted = [...net];
    let rec_sorted = [...rec];
    let trans_sorted = [...trans];

    cpu_sorted.sort(function (a, b) {return a - b});
    IO_sorted.sort(function (a, b) {return a - b});
    disk_r_sorted.sort(function (a, b) {return a - b});
    disk_w_sorted.sort(function (a, b) {return a - b});
    net_sorted.sort(function (a, b) {return a - b});
    rec_sorted.sort(function (a, b) {return a - b});
    trans_sorted.sort(function (a, b) {return a - b});
    // 以上是冒泡排序方法

    let start_time = Date.parse(new Date(x_label[0]));
    let end_time = Date.parse(new Date(x_label[x_label.length - 1]));
    let dur = ((end_time - start_time) / 3600000).toFixed(2);
    let duration = dur + 'h';
    if (dur < 1) {
        dur = ((end_time - start_time) / 60000).toFixed(2);
        duration = dur + 'm';
        if (dur < 1) {
            dur = ((end_time - start_time) / 1000).toFixed(2);
            duration = dur + 's';
        }
    }

    option = {
        title: [
            {
                text: 'CPU(%), 最大值: ' + cpu_sorted.slice(-1)[0].toFixed(2) + '%, 90%Line: ' + cpu_sorted[parseInt(0.9 * cpu_sorted.length)].toFixed(2) + '%, 时间: ' + duration,
                x: 'center',
                y: 5,
                textStyle: {
                    fontSize: 13
                }
            },
            {
                text: '剩余内存(G), 最小值: ' + findMin(mem).toFixed(2) + 'G, 时间: ' + duration,
                x: 'center',
                y: 350,
                textStyle: {
                    fontSize: 13
                }
            },
            {
                text: 'IO, IO最大值: ' + IO_sorted.slice(-1)[0].toFixed(2) + '%, 读磁盘最大值: ' + disk_r_sorted.slice(-1)[0].toFixed(2) + 'Mb/s, 写磁盘最大值: ' + disk_w_sorted.slice(-1)[0].toFixed(2) + 'Mb/s, 时间: ' + duration,
                x: 'center',
                y: 700,
                textStyle: {
                    fontSize: 13
                }
            },
            {
                text: '带宽, 带宽最大值: ' + net_sorted.slice(-1)[0].toFixed(2) + '%, 接收速率最大值: ' + rec_sorted.slice(-1)[0].toFixed(2) + 'Mb/s, 发送速率最大值: ' + trans_sorted.slice(-1)[0].toFixed(2) + 'Mb/s, 时间: ' + duration,
                x: 'center',
                y: 1050,
                textStyle: {
                    fontSize: 13
                }
            },
            {
                text: 'TCP, TCP连接数最大值: ' + findMax(tcp) + ', TCP重传率最大值: '+ findMax(retrans).toFixed(2) + '%, 时间: ' + duration,
                x: 'center',
                y: 1400,
                textStyle: {
                    fontSize: 13
                }
            }
        ],

        grid: [
            {
                left: '5%',
                right: '5%',
                top: 50,
                height: 250
            },
            {
                left: '5%',
                right: '5%',
                top: 400,
                height: 250
            },
            {
                left: '5%',
                right: '5%',
                top: 750,
                height: 250
            },
            {
                left: '5%',
                right: '5%',
                top: 1100,
                height: 250
            },
            {
                left: '5%',
                right: '5%',
                top: 1450,
                height: 250
            }
        ],

        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'cross'
            }
        },

        color: ['red', 'red', 'blue', 'orange', 'red', 'orange', 'red', 'red', 'blue'],
        legend: [
            {
                data: ['CPU使用率'],
                x: 'center',
                y: 25,
                icon: 'line'
            },
            {
                data: ['内存'],
                x: 'center',
                y: 375,
                icon: 'line'
            },
            {
                data: ['rMb/s', 'wMb/s', 'IO'],
                x: 'center',
                y: 725,
                icon: 'line'
            },
            {
                data: ['rMb/s', 'tMb/s', 'Net'],
                x: 'center',
                y: 1075,
                icon: 'line'
            },
            {
                data: ['TCP连接数', 'TCP重传率'],
                x: 'center',
                y: 1425,
                icon: 'line'
            }
        ],

        dataZoom: [
            {
                xAxisIndex: [0, 1, 2, 3, 4],
                type: 'inside',
                startValue: 0,
                endValue: cpu.length
            },
            {
                xAxisIndex: [0, 1, 2, 3, 4],
                type: 'slider',
                startValue: 0,
                endValue: cpu.length
            }
        ],

        xAxis: [
            {
                gridIndex: 0,
                type: 'category',
                boundaryGap: false,
                data: x_label,
                axisTick: {
                    alignWithLabel: true,
                    interval: 'auto'
                },
                axisLabel: {
                    interval: 'auto',
                    showMaxLabel: true
                }
            },
            {
                gridIndex: 1,
                type: 'category',
                boundaryGap: false,
                data: x_label,
                axisTick: {
                    alignWithLabel: true,
                    interval: 'auto'
                },
                axisLabel: {
                    interval: 'auto',
                    showMaxLabel: true
                }
            },
            {
                gridIndex: 2,
                type: 'category',
                boundaryGap: false,
                data: x_label,
                axisTick: {
                    alignWithLabel: true,
                    interval: 'auto'
                },
                axisLabel: {
                    interval: 'auto',
                    showMaxLabel: true
                }
            },
            {
                gridIndex: 3,
                type: 'category',
                boundaryGap: false,
                data: x_label,
                axisTick: {
                    alignWithLabel: true,
                    interval: 'auto'
                },
                axisLabel: {
                    interval: 'auto',
                    showMaxLabel: true
                }
            },
            {
                gridIndex: 4,
                type: 'category',
                boundaryGap: false,
                data: x_label,
                axisTick: {
                    alignWithLabel: true,
                    interval: 'auto'
                },
                axisLabel: {
                    interval: 'auto',
                    showMaxLabel: true
                }
            }
        ],

        yAxis: [
            {
                gridIndex: 0,
                name: 'CPU(%)',
                type: 'value',
                max: 100
            },
            {gridIndex: 0},
            {
                gridIndex: 1,
                name: '内存(G)',
                type: 'value',
                max: (findMax(mem) + 1).toFixed(2)
            },
            {gridIndex: 1},
            {
                gridIndex: 2,
                name: '读写速度(Mb/s)',
                type: 'value',
                max: Math.max(disk_r_sorted.slice(-1)[0], disk_w_sorted.slice(-1)[0]).toFixed(2)
            },
            {
                gridIndex: 2,
                name: 'IO(%)',
                type: 'value',
                max: IO_sorted.slice(-1)[0].toFixed(2)
            },
            {
                gridIndex: 3,
                name: '网速(Mb/s)',
                type: 'value',
                max: Math.max(rec_sorted.slice(-1)[0], trans_sorted.slice(-1)[0]).toFixed(2)
            },
            {
                gridIndex: 3,
                name: 'Net(%)',
                type: 'value',
                max: net_sorted.slice(-1)[0].toFixed(2)
            },
            {
                gridIndex: 4,
                name: 'TCP',
                type: 'value',
                max: findMax(tcp)
            },
            {
                gridIndex: 4,
                name: 'TCP重传率(%)',
                type: 'value',
                max: (findMax(retrans) * 1.2).toFixed(2)
            }
        ],
        series: [
            {
                name: 'CPU使用率',
                type: 'line',
                xAxisIndex: 0,
                yAxisIndex: 0,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'red'
                },
                data: cpu
            },

            {
                name: '内存',
                type: 'line',
                xAxisIndex: 1,
                yAxisIndex: 2,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'red'
                },
                data: mem
            },
            {
                name: 'rMb/s',
                type: 'line',
                xAxisIndex: 2,
                yAxisIndex: 4,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'blue'
                },
                data: disk_r
            },
            {
                name: 'wMb/s',
                type: 'line',
                xAxisIndex: 2,
                yAxisIndex: 4,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'orange'
                },
                data: disk_w
            },
            {
                name: 'IO',
                type: 'line',
                xAxisIndex: 2,
                yAxisIndex: 5,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'red'
                },
                data: IO
            },
            {
                name: 'rMb/s',
                type: 'line',
                xAxisIndex: 3,
                yAxisIndex: 6,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'blue'
                },
                data: rec
            },
            {
                name: 'tMb/s',
                type: 'line',
                xAxisIndex: 3,
                yAxisIndex: 6,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'orange'
                },
                data: trans
            },
            {
                name: 'Net',
                type: 'line',
                xAxisIndex: 3,
                yAxisIndex: 7,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'red'
                },
                data: net
            },
            {
                name: 'TCP连接数',
                type: 'line',
                xAxisIndex: 4,
                yAxisIndex: 8,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'red'
                },
                data: tcp
            },
            {
                name: 'TCP重传率',
                type: 'line',
                xAxisIndex: 4,
                yAxisIndex: 9,
                showSymbol: false,
                lineStyle: {
                    width: 1,
                    color: 'blue'
                },
                data: retrans
            }
        ]
    };

    myChart.clear();
    myChart.setOption(option);

    tables1.rows[1].cells[1].innerHTML = cpu_sorted[parseInt(0.75 * cpu_sorted.length)].toFixed(2);
    tables1.rows[2].cells[1].innerHTML = cpu_sorted[parseInt(0.9 * cpu_sorted.length)].toFixed(2);
    tables1.rows[3].cells[1].innerHTML = cpu_sorted[parseInt(0.95 * cpu_sorted.length)].toFixed(2);
    tables1.rows[4].cells[1].innerHTML = cpu_sorted[parseInt(0.99 * cpu_sorted.length)].toFixed(2);
    tables1.rows[1].cells[2].innerHTML = disk_r_sorted[parseInt(0.75 * disk_r_sorted.length)].toFixed(2);
    tables1.rows[2].cells[2].innerHTML = disk_r_sorted[parseInt(0.9 * disk_r_sorted.length)].toFixed(2);
    tables1.rows[3].cells[2].innerHTML = disk_r_sorted[parseInt(0.95 * disk_r_sorted.length)].toFixed(2);
    tables1.rows[4].cells[2].innerHTML = disk_r_sorted[parseInt(0.99 * disk_r_sorted.length)].toFixed(2);
    tables1.rows[1].cells[3].innerHTML = disk_w_sorted[parseInt(0.75 * disk_w_sorted.length)].toFixed(2);
    tables1.rows[2].cells[3].innerHTML = disk_w_sorted[parseInt(0.9 * disk_w_sorted.length)].toFixed(2);
    tables1.rows[3].cells[3].innerHTML = disk_w_sorted[parseInt(0.95 * disk_w_sorted.length)].toFixed(2);
    tables1.rows[4].cells[3].innerHTML = disk_w_sorted[parseInt(0.99 * disk_w_sorted.length)].toFixed(2);
    tables1.rows[1].cells[4].innerHTML = IO_sorted[parseInt(0.75 * IO_sorted.length)].toFixed(2);
    tables1.rows[2].cells[4].innerHTML = IO_sorted[parseInt(0.9 * IO_sorted.length)].toFixed(2);
    tables1.rows[3].cells[4].innerHTML = IO_sorted[parseInt(0.95 * IO_sorted.length)].toFixed(2);
    tables1.rows[4].cells[4].innerHTML = IO_sorted[parseInt(0.99 * IO_sorted.length)].toFixed(2);
    tables1.rows[1].cells[5].innerHTML = rec_sorted[parseInt(0.75 * rec_sorted.length)].toFixed(2);
    tables1.rows[2].cells[5].innerHTML = rec_sorted[parseInt(0.9 * rec_sorted.length)].toFixed(2);
    tables1.rows[3].cells[5].innerHTML = rec_sorted[parseInt(0.95 * rec_sorted.length)].toFixed(2);
    tables1.rows[4].cells[5].innerHTML = rec_sorted[parseInt(0.99 * rec_sorted.length)].toFixed(2);
    tables1.rows[1].cells[6].innerHTML = trans_sorted[parseInt(0.75 * trans_sorted.length)].toFixed(2);
    tables1.rows[2].cells[6].innerHTML = trans_sorted[parseInt(0.9 * trans_sorted.length)].toFixed(2);
    tables1.rows[3].cells[6].innerHTML = trans_sorted[parseInt(0.95 * trans_sorted.length)].toFixed(2);
    tables1.rows[4].cells[6].innerHTML = trans_sorted[parseInt(0.99 * trans_sorted.length)].toFixed(2);
    tables1.rows[1].cells[7].innerHTML = net_sorted[parseInt(0.75 * net_sorted.length)].toFixed(2);
    tables1.rows[2].cells[7].innerHTML = net_sorted[parseInt(0.9 * net_sorted.length)].toFixed(2);
    tables1.rows[3].cells[7].innerHTML = net_sorted[parseInt(0.95 * net_sorted.length)].toFixed(2);
    tables1.rows[4].cells[7].innerHTML = net_sorted[parseInt(0.99 * net_sorted.length)].toFixed(2);

    myChart.on('dataZoom', function (param) {
        let start_index = myChart.getOption().dataZoom[0].startValue;
        let end_index = myChart.getOption().dataZoom[0].endValue;
        let mem_zoom = mem.slice(start_index, end_index);
        let tcp_zoom = tcp.slice(start_index, end_index);
        let retrans_zoom = retrans.slice(start_index, end_index);

        // 以下是使用默认的排序方法，冒泡排序
        let cpu_sorted = cpu.slice(start_index, end_index);
        let IO_sorted = IO.slice(start_index, end_index);
        let disk_r_sorted = disk_r.slice(start_index, end_index);
        let disk_w_sorted = disk_w.slice(start_index, end_index);
        let rec_sorted = rec.slice(start_index, end_index);
        let trans_sorted = trans.slice(start_index, end_index);
        let net_sorted = net.slice(start_index, end_index);
        cpu_sorted.sort(function (a, b) {return a - b});
        IO_sorted.sort(function (a, b) {return a - b});
        disk_r_sorted.sort(function (a, b) {return a - b});
        disk_w_sorted.sort(function (a, b) {return a - b});
        net_sorted.sort(function (a, b) {return a - b});
        rec_sorted.sort(function (a, b) {return a - b});
        trans_sorted.sort(function (a, b) {return a - b});
        // 以上是冒泡排序方法

        // 以下是使用快速排序算法排序
        /*let cpu_sorted = quickSort(cpu.slice(start_index, end_index));
        let IO_sorted = quickSort(IO.slice(start_index, end_index));
        let disk_r_sorted = quickSort(disk_r.slice(start_index, end_index));
        let disk_w_sorted = quickSort(disk_w.slice(start_index, end_index));
        let net_sorted = quickSort(net.slice(start_index, end_index));
        let rec_sorted = quickSort(rec.slice(start_index, end_index));
        let trans_sorted = quickSort(trans.slice(start_index, end_index));*/

        let start_time = Date.parse(new Date(x_label[start_index]));
        let end_time = Date.parse(new Date(x_label[end_index]));
        let dur = ((end_time - start_time) / 3600000).toFixed(2);
        let duration = dur + 'h';
        if (dur < 1) {
            dur = ((end_time - start_time) / 60000).toFixed(2);
            duration = dur + 'm';
            if (dur < 1) {
                dur = ((end_time - start_time) / 1000).toFixed(2);
                duration = dur + 's';
            }
        }
        myChart.setOption({
            title: [
                {text: 'CPU(%), 最大值: ' + cpu_sorted.slice(-1)[0].toFixed(2) + '%, 90%Line: ' + cpu_sorted[parseInt(0.9 * cpu_sorted.length)].toFixed(2) + '%, 时间: ' + duration, x: 'center', y: 5, textStyle: {fontSize: 13}},
                {text: '内存(G), 最大值: ' + findMax(mem_zoom).toFixed(2) + 'G, 时间: ' + duration, x: 'center', y: 350, textStyle: {fontSize: 13}},
                {text: 'IO, IO最大值: ' + IO_sorted.slice(-1)[0].toFixed(2) + '%, 读磁盘最大值: ' + disk_r_sorted.slice(-1)[0].toFixed(2) + 'Mb/s, 写磁盘最大值: ' + disk_w_sorted.slice(-1)[0].toFixed(2) + 'Mb/s, 时间: ' + duration, x: 'center', y: 700, textStyle: {fontSize: 13}},
                {text: '带宽, 带宽最大值: ' + net_sorted.slice(-1)[0].toFixed(2) + '%, 接收速率最大值: ' + rec_sorted.slice(-1)[0].toFixed(2) + 'Mb/s, 发送速率最大值: ' + trans_sorted.slice(-1)[0].toFixed(2) + 'Mb/s, 时间: ' + duration, x: 'center', y: 1050, textStyle: {fontSize: 13}},
                {text: 'TCP, TCP连接数最大值: ' + findMax(tcp_zoom) + ', TCP重传率最大值: '+ findMax(retrans_zoom).toFixed(2) + '%, 时间: ' + duration, x: 'center', y: 1400, textStyle: {fontSize: 13}}]});

        tables1.rows[1].cells[1].innerHTML = cpu_sorted[parseInt(0.75 * cpu_sorted.length)].toFixed(2);
        tables1.rows[2].cells[1].innerHTML = cpu_sorted[parseInt(0.9 * cpu_sorted.length)].toFixed(2);
        tables1.rows[3].cells[1].innerHTML = cpu_sorted[parseInt(0.95 * cpu_sorted.length)].toFixed(2);
        tables1.rows[4].cells[1].innerHTML = cpu_sorted[parseInt(0.99 * cpu_sorted.length)].toFixed(2);
        tables1.rows[1].cells[2].innerHTML = disk_r_sorted[parseInt(0.75 * disk_r_sorted.length)].toFixed(2);
        tables1.rows[2].cells[2].innerHTML = disk_r_sorted[parseInt(0.9 * disk_r_sorted.length)].toFixed(2);
        tables1.rows[3].cells[2].innerHTML = disk_r_sorted[parseInt(0.95 * disk_r_sorted.length)].toFixed(2);
        tables1.rows[4].cells[2].innerHTML = disk_r_sorted[parseInt(0.99 * disk_r_sorted.length)].toFixed(2);
        tables1.rows[1].cells[3].innerHTML = disk_w_sorted[parseInt(0.75 * disk_w_sorted.length)].toFixed(2);
        tables1.rows[2].cells[3].innerHTML = disk_w_sorted[parseInt(0.9 * disk_w_sorted.length)].toFixed(2);
        tables1.rows[3].cells[3].innerHTML = disk_w_sorted[parseInt(0.95 * disk_w_sorted.length)].toFixed(2);
        tables1.rows[4].cells[3].innerHTML = disk_w_sorted[parseInt(0.99 * disk_w_sorted.length)].toFixed(2);
        tables1.rows[1].cells[4].innerHTML = IO_sorted[parseInt(0.75 * IO_sorted.length)].toFixed(2);
        tables1.rows[2].cells[4].innerHTML = IO_sorted[parseInt(0.9 * IO_sorted.length)].toFixed(2);
        tables1.rows[3].cells[4].innerHTML = IO_sorted[parseInt(0.95 * IO_sorted.length)].toFixed(2);
        tables1.rows[4].cells[4].innerHTML = IO_sorted[parseInt(0.99 * IO_sorted.length)].toFixed(2);
        tables1.rows[1].cells[5].innerHTML = rec_sorted[parseInt(0.75 * rec_sorted.length)].toFixed(2);
        tables1.rows[2].cells[5].innerHTML = rec_sorted[parseInt(0.9 * rec_sorted.length)].toFixed(2);
        tables1.rows[3].cells[5].innerHTML = rec_sorted[parseInt(0.95 * rec_sorted.length)].toFixed(2);
        tables1.rows[4].cells[5].innerHTML = rec_sorted[parseInt(0.99 * rec_sorted.length)].toFixed(2);
        tables1.rows[1].cells[6].innerHTML = trans_sorted[parseInt(0.75 * trans_sorted.length)].toFixed(2);
        tables1.rows[2].cells[6].innerHTML = trans_sorted[parseInt(0.9 * trans_sorted.length)].toFixed(2);
        tables1.rows[3].cells[6].innerHTML = trans_sorted[parseInt(0.95 * trans_sorted.length)].toFixed(2);
        tables1.rows[4].cells[6].innerHTML = trans_sorted[parseInt(0.99 * trans_sorted.length)].toFixed(2);
        tables1.rows[1].cells[7].innerHTML = net_sorted[parseInt(0.75 * net_sorted.length)].toFixed(2);
        tables1.rows[2].cells[7].innerHTML = net_sorted[parseInt(0.9 * net_sorted.length)].toFixed(2);
        tables1.rows[3].cells[7].innerHTML = net_sorted[parseInt(0.95 * net_sorted.length)].toFixed(2);
        tables1.rows[4].cells[7].innerHTML = net_sorted[parseInt(0.99 * net_sorted.length)].toFixed(2);
    });
}

function findMax(arr) {
    let len = arr.length
    let max = arr[0];
    while (len--) {
        if (arr[len] > max) {
            max = arr[len];
        }
    }
    return max;
}

function findMin(arr) {
    let len = arr.length
    let min = arr[0];
    while (len--) {
        if (arr[len] < min) {
            min = arr[len];
        }
    }
    return min;
}

function quickSort(arr){
    if(arr.length<=1){
        return arr;
    }
    let temp = arr.pop();
    let left = [];
    let right = [];
    for(let i=0;i<arr.length;i++){
        if(arr[i]<temp){
            left.push(arr[i]);
        }else{
            right.push(arr[i]);
        }
    }
    return quickSort(left).concat(temp,quickSort(right));
}