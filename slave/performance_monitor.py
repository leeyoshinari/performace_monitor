#!/usr/bin/env python
# -*- coding:utf-8 -*-
# Author: leeyoshinari
import os
import re
import time
import queue
import threading
from concurrent.futures import ThreadPoolExecutor

import requests
import influxdb
from config import Config
from logger import logger, cfg


class PerMon(object):
    def __init__(self):
        self.IP = cfg.getServer('host')
        self.is_system = 0    # 是否监控系统CPU和内存, 0为不监控, 1为监控.
        self._msg = {'port': [], 'pid': [], 'isRun': [], 'startTime': [], 'stopTime': []}   # 端口号、进程号、监控状态、开始监控时间
        self.interval = cfg.getMonitor('interval')   # 每次执行监控命令的时间间隔
        self.error_times = cfg.getMonitor('errorTimes')   # 执行命令失败次数

        self.system_version = ''   # 系统版本
        self.cpu_cores = 0  # CPU核数
        self.total_mem = 0  # 总内存
        self.all_disk = []  # 磁盘号

        self.get_system_version()
        self.get_cpu_cores()
        self.get_total_mem()
        self.get_disks()

        self.monitor_task = queue.Queue()   # 创建一个FIFO队列
        self.executor = ThreadPoolExecutor(cfg.getServer('threadPool')+1)  # 创建线程池

        self.client = influxdb.InfluxDBClient(cfg.getInflux('host'), cfg.getInflux('port'), cfg.getInflux('username'),
                                              cfg.getInflux('password'), cfg.getInflux('database'))   # 创建数据库连接

        self.FGC = {}           # 每个端口的full gc次数
        self.FGC_time = {}      # 每个端口每次full gc的时间

        self.monitor()

    @property
    def start(self):
        return self._msg

    @start.setter
    def start(self, value):
        if value['port']:
            if value['port'] in self._msg['port']:  # 如果端口已经监控过，则更新相关数据
                index = self._msg['port'].index(value['port'])
                self._msg['pid'][index] = value['pid']
                if self._msg['isRun'][index] == 0:  # 如果已经停止监控，则更新监控状态和开始监控时间
                    self._msg['isRun'][index] = value['is_run']
                    self._msg['startTime'][index] = time.strftime('%Y-%m-%d %H:%M:%S')
                    self._msg['stopTime'][index] = None
                    self.monitor_task.put((self.write_cpu_mem, index))  # 把监控的端口任务放入队列中

                    self.FGC[str(value['port'])] = 0    # 重置 FGC次数
                    self.FGC_time[str(value['port'])] = []  # 重置 FGC 时间

                    if self.monitor_task.qsize() > 0:   # 如果队列不为空，则监控状态置为2，排队中
                        self._msg['isRun'][index] = 2
                else:
                    pass
            else:
                self._msg['pid'].append(value['pid'])   # 如果端口未监控过，则添加该端口相关数据
                self._msg['port'].append(value['port'])
                self._msg['isRun'].append(value['is_run'])
                self._msg['startTime'].append(time.strftime('%Y-%m-%d %H:%M:%S'))
                self._msg['stopTime'].append(None)
                self.monitor_task.put((self.write_cpu_mem, len(self._msg['port'])-1))   # 把监控的端口任务放入队列中

                self.FGC.update({str(value['port']): 0})    # 初始化 FGC 次数
                self.FGC_time.update({str(value['port']): []})  # 初始化 FGC 时间

                if self.monitor_task.qsize() > 0:   # 如果队列不为空，则监控状态置为2，排队中
                    self._msg['isRun'][-1] = 2
        else:
            raise Exception('参数异常')

        if len(self._msg['port']) > 0:  # 如果已经开始监控端口，则同时开始监控整个系统
            self.is_system = 1

    @property
    def stop(self):
        return self._msg

    @stop.setter
    def stop(self, value):
        index = self._msg['port'].index(value['port'])
        self._msg['isRun'][index] = value['is_run']

    def worker(self):
        """
        从队列中获取数据，并开始监控
        :return:
        """
        while True:
            func, param = self.monitor_task.get()
            func(param)
            self.monitor_task.task_done()

    def monitor(self):
        """
        开始监控
        :return:
        """
        for i in range(cfg.getServer('threadPool')+1):
            self.executor.submit(self.worker)   # 启动线程池监控任务

        self.monitor_task.put((self.register_and_clear_port, 1))    # 将注册和清理任务放入队列中
        self.monitor_task.put((self.write_system_cpu_mem, 1))   # 将监控系统的任务放入队列中

    def write_cpu_mem(self, index):
        """
        监控端口的CPU使用率、占用内存大小和jvm变化（Java应用）
        :param index: 监控端口的下标索引
        :return:
        """
        self._msg['startTime'][index] = time.strftime('%Y-%m-%d %H:%M:%S')      # 更新开始监控时间

        run_error = 0      # 初始化执行监控命令失败的次数
        run_error_time = time.time()    # 初始化执行监控命令失败的时间
        start_search_time = time.time()     # 每次执行监控命令的开始时间
        port = self._msg['port'][index]
        pid = self._msg['pid'][index]

        line = [{'measurement': self.IP,
                 'fields': {
                     'type': str(port),
                     'cpu': 0,
                     'mem': 0,
                     'jvm': 0
                 }}]

        while True:
            if self._msg['isRun'][index] > 0:   # 开始监控
                self._msg['isRun'][index] = 1   # 重置端口监控状态为监控中
                get_data_time = time.time()     # 获取当前时间
                if get_data_time - start_search_time > self.interval:    # 如果两次执行命令的时间间隔大于设置值
                    start_search_time = get_data_time    # 更新时间
                    try:
                        cpu, mem = self.get_cpu_mem(pid)    # 获取CPU使用率和占用内存大小

                        if cpu is None:     # 如果CPU使用率未获取到，说明监控命令执行异常
                            if port:    # 如果端口号存在
                                pid = port_to_pid(port)  # 根据端口号查询进程号
                                if pid:     # 如果进程号存在，则更新进程号
                                    self._msg['pid'][index] = pid
                                    self._msg['startTime'][index] = time.strftime('%Y-%m-%d %H:%M:%S')

                                # 如果连续30分钟执行监控命令都失败，则停止监控
                                if time.time() - run_error_time > 1800:
                                    self._msg['isRun'][index] = 0
                                    self._msg['stopTime'][index] = time.time()
                                    logger.error(f'{port}端口连续1800s执行监控命令都失败，已停止监控')
                                    break

                                time.sleep(cfg.getMonitor('sleepTime'))
                                continue
                            else:   # 如果没有端口号，说明监控的直接是进程号
                                # 如果连续执行监控命令失败的次数大于设置值，则停止监控
                                if run_error > self.error_times:
                                    self._msg['isRun'][index] = 0
                                    self._msg['stopTime'][index] = time.time()
                                    logger.error(f'{pid}进程连续{run_error}次执行监控命令失败，已停止监控')
                                    break

                                run_error += 1  # 执行命令失败次数加1
                                logger.error(f'当前{pid}进程执行监控命令失败次数为{run_error}.')
                                time.sleep(cfg.getMonitor('sleepTime'))
                                continue

                        jvm = self.get_jvm(port, pid)     # 获取JVM内存

                        line[0]['fields']['cpu'] = cpu
                        line[0]['fields']['mem'] = mem
                        line[0]['fields']['jvm'] = jvm
                        self.client.write_points(line)    # 写数据到数据库
                        logger.info(f'cpu_and_mem: port_{port},pid_{pid},{cpu},{mem},{jvm}')
                        run_error_time = time.time()    # 如果监控命令执行成功，则重置
                        run_error = 0      # 如果监控命令执行成功，则重置

                    except Exception as err:
                        logger.error(err)
                        time.sleep(cfg.getMonitor('sleepTime'))
                        continue

            if self._msg['isRun'][index] == 0:   # 如果监控状态为0， 则停止监控
                self._msg['stopTime'][index] = time.time()
                logger.info(f'{port}端口已经停止监控')
                self.FGC[str(port)] = 0
                break

    def write_system_cpu_mem(self, is_system):
        """
        监控系统CPU使用率、剩余内存和磁盘IO
        :param is_system: 未使用
        :return:
        """
        flag = True     # 控制是否邮件通知标志
        echo = True     # 控制是否清理缓存标志

        line = [{'measurement': self.IP,
                 'fields': {
                     'type': 'system',
                     'cpu': 0.0,
                     'mem': 0.0,
                 }}]
        for disk in self.all_disk:
            # 系统磁盘号目前发现2种格式，分别是'sda'和'sda-1'，因为influxdb查询时，无法识别'-'，故replace。其他格式的待验证
            disk_n = disk.replace('-', '')
            line[0]['fields'].update({disk_n: 0.0})

        while True:
            if self.is_system == 1:     # 开始监控
                disk, cpu, mem = self.get_system_cpu_io()   # 获取系统CPU、内存和磁盘IO

                if disk and cpu is not None and mem is not None:
                    for k, v in disk.items():
                        line[0]['fields'][k] = v     # 写磁盘IO数据到数据库

                    line[0]['fields']['cpu'] = cpu
                    line[0]['fields']['mem'] = mem
                    self.client.write_points(line)    # 写cpu和内存到数据库
                    logger.info(f'system: CpuAndMem,{cpu},{mem},{disk}')

                    if mem <= cfg.getMonitor('minMem'):
                        logger.warning(f'当前系统剩余内存为{mem}G，内存过低')
                        if cfg.getMonitor('isMemAlert') and flag:
                            flag = False    # 标志符置为False，防止连续不断的发送邮件
                            notification(msg=f'{self.IP} 当前系统剩余内存为{mem}G，内存过低')     # 发送邮件通知

                        if cfg.getMonitor('echo') and echo:
                            echo = False    # 标志符置为False，防止连续不断的清理缓存
                            thread = threading.Thread(target=self.clear_cache, args=())     # 开启多线程清理缓存
                            thread.start()

                    else:
                        # 如果内存正常，标识符重置为True
                        flag = True
                        echo = True

            else:
                time.sleep(1)

    def get_cpu_mem(self, pid):
        """
        获取进程的CPU使用率和内存使用大小
        :param pid: 进程号
        :return: CPU使用率（%）和内存占用大小（G）
        """
        cpu = None
        mem = None

        try:
            # result = os.popen(f'top -n 1 -b -p {pid} |tr -s " "').readlines()
            result = os.popen(f'top -n 1 -b |grep -P {pid} |tr -s " "').readlines()     # 执行命令
            res = [res.strip().split(' ') for res in result]
            logger.debug(res)

            for r in res:
                if str(pid) == r[0]:
                    ind = r.index(str(pid))
                    cpu = float(r[ind + 8]) / self.cpu_cores      # CPU使用率
                    mem = float(r[ind + 9]) * self.total_mem      # 内存占用大小

        except Exception as err:
            logger.error(err)

        return cpu, mem

    def get_jvm(self, port, pid):
        """
        获取JVM内存
        :param port: 端口号
        :param pid: 进程号
        :return: jvm内存大小（G）
        """
        mem = 0
        try:
            result = os.popen(f'jstat -gc {pid} |tr -s " "').readlines()[1]     # 执行命令
            res = result.strip().split(' ')
            logger.debug(res)
            mem = float(res[2]) + float(res[3]) + float(res[5]) + float(res[7])     # 计算jvm

            # 已追加写的方式，将FGC次数和时间写到本地。当FGC频率过高时，发送邮件提醒
            fgc = int(res[14])
            if self.FGC[str(port)] < fgc:  # 如果FGC次数增加
                self.FGC[str(port)] = fgc
                self.FGC_time[str(port)].append(time.time())
                if len(self.FGC_time[str(port)]) > 2:   # 计算FGC频率
                    frequency = (self.FGC_time[str(port)][-1] - self.FGC_time[str(port)][0]) / self.FGC[str(port)]
                    if frequency < cfg.getMonitor('frequencyFGC'):    # 如果FGC频率大于设置值，则发送邮件提醒
                        logger.warning(f'{port}端口的Full GC频率为{frequency}.')
                        if cfg.getMonitor('isJvmAlert'):
                            notification(msg=f'{self.IP}服务器上的{port}端口的Full GC频率为{frequency}.')

                # 将FGC次数和时间写到日志
                logger.warning(f"端口{port}第{self.FGC[str(port)]}次Full GC.")

            elif self.FGC[str(port)] > fgc:   # 如果FGC次数减小，说明可能重启，则重置
                self.FGC[str(port)] = 0

            if self.FGC[str(port)] == 0:    # 如果FGC次数为0，则重置
                self.FGC_time[str(port)] = []

        except Exception as err:
            logger.info(err)

        return mem / 1024 / 1024

    def get_system_cpu_io(self):
        """
        获取系统CPU使用率、剩余内存和磁盘IO
        :return: 磁盘IO，cpu使用率（%），剩余内存（G）
        """
        disk = {}
        cpu = None
        mem = None
        try:
            result = os.popen(f'iostat -x -k 1 2 |tr -s " "').readlines()    # 执行命令
            result.pop(0)
            disk_res = [l.strip() for l in result if len(l) > 5]
            disk_res = disk_res[int(len(disk_res)/2)-1:]
            logger.debug(disk_res)

            for i in range(len(disk_res)):
                if 'avg-cpu' in disk_res[i]:
                    cpu_res = disk_res[i+1].strip().split(' ')      # CPU空闲率
                    if len(cpu_res) > 3:
                        cpu = 100 - float(cpu_res[-1])      # CPU使用率
                        continue

                if 'Device' in disk_res[i]:
                    for j in range(i+1, len(disk_res)):     # 遍历所有磁盘
                        disk_line = disk_res[j].strip().split(' ')
                        disk_num = disk_line[0].replace('-', '')    # replace的原因是因为influxdb查询时，无法识别'-'
                        disk.update({disk_num: disk_line[-1]})  # 将每个磁盘的IO以字典的形式保存

                    continue

            result = os.popen('cat /proc/meminfo| grep MemFree| uniq').readlines()[0]   # 执行命令，获取系统剩余内存
            mem = float(result.split(':')[-1].split('k')[0].strip()) / 1024 / 1024

        except Exception as err:
            logger.error(err)

        return disk, cpu, mem

    '''def get_handle(pid):
        """
        获取进程占用的句柄数
        :param pid: 进程号
        :return: 句柄数
        """
        result = os.popen("lsof -n | awk '{print $2}'| sort | uniq -c | sort -nr | " + "grep {}".format(pid)).readlines()
        res = result[0].strip().split(' ')
        logger.debug(res)
        handles = None
        if str(pid) in res:
            handles = int(res[0])

        return handles'''

    def get_cpu_cores(self):
        """
        获取系统CPU核数
        :return:
        """
        result = os.popen('cat /proc/cpuinfo| grep "processor"| wc -l').readlines()[0]
        self.cpu_cores = int(result)
        logger.info(f'当前系统CPU核数为{self.cpu_cores}')

    def get_total_mem(self):
        """
        获取系统总内存
        :return:
        """
        result = os.popen('cat /proc/meminfo| grep "MemTotal"| uniq').readlines()[0]
        self.total_mem = float(result.split(':')[-1].split('k')[0].strip()) / 1024 / 1024 / 100
        logger.info(f'当前系统总内存为{self.total_mem * 100}G')

    def get_disks(self):
        """
        获取系统所有磁盘号
        :return:
        """
        result = os.popen(f'iostat -x -k |tr -s " "').readlines()
        disk_res = [l.strip() for l in result if len(l) > 5]
        for i in range(len(disk_res)):
            if 'Device' in disk_res[i]:
                for j in range(i + 1, len(disk_res)):
                    disk_line = disk_res[j].strip().split(' ')
                    self.all_disk.append(disk_line[0])

        logger.info(f'当前系统共有{len(self.all_disk)}个磁盘，磁盘号分别为{"、".join(self.all_disk)}')

    def get_system_version(self):
        """
        获取系统发行版本或内核版本
        :return:
        """
        try:
            result = os.popen('cat /etc/redhat-release').readlines()    # 获取系统发行版本
            if result:
                self.system_version = result[0].strip()
            else:
                result = os.popen('cat /proc/version').readlines()[0]   # 获取系统内核版本
                res = re.findall("gcc.*\((.*?)\).*GCC", result.strip())
                self.system_version = res[0]
        except Exception as err:
            logger.error(err)

        logger.info(f'当前系统发行/内核版本为{self.system_version}')

    def clear_port(self):
        """
        清理系统存储的已经停止监控超过86400s的端口信息
        :return:
        """
        pop_list = []
        for ind in range(len(self._msg['port'])):
            if self._msg['isRun'][ind] == 0 and self._msg['stopTime'][ind]:
                if time.time() - self._msg['stopTime'][ind] > 86400:
                    pop_list.append(ind)

        for ll in pop_list:
            port = self._msg['port'].pop(ll)
            self._msg['pid'].pop(ll)
            self._msg['isRun'].pop(ll)
            self._msg['startTime'].pop(ll)
            self._msg['stopTime'].pop(ll)

            del self.FGC[str(port)]
            del self.FGC_time[str(port)]

            logger.info(f'清理端口{port}成功')

    def register_and_clear_port(self, flag=None):
        """
        定时任务，总共有两个，一个是向服务端注册本机，一个是清理已经停止监控的过期端口
        :param
        :return:
        """
        url = f'http://{cfg.getMaster("host")}:{cfg.getMaster("port")}/Register'

        header = {
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate",
            "Content-Type": "application/json; charset=UTF-8"}

        post_data = {
            'host': self.IP,
            'port': cfg.getServer('port'),
            'system': self.system_version,
            'cpu': self.cpu_cores,
            'mem': round(self.total_mem*100, 2),
            'disks': ','.join(self.all_disk)
        }

        clear_time = time.time()
        while True:
            try:
                res = requests.post(url=url, json=post_data, headers=header)
                if time.time() - clear_time > 3600:
                    self.clear_port()
                    clear_time = time.time()
            except Exception as err:
                logger.error(err)

            time.sleep(5)

    @staticmethod
    def clear_cache():
        """
        清理缓存
        :return:
        """
        logger.info(f'开始清理缓存：echo {cfg.getMonitor("echo")} >/proc/sys/vm/drop_caches')
        os.popen(f'echo {cfg.getMonitor("echo")} >/proc/sys/vm/drop_caches')
        logger.info('清理缓存成功')

    def __del__(self):
        pass


def port_to_pid(port):
    """
    根据端口号查询进程号
    :param port: 端口号
    :return: 进程号
    """
    pid = None
    try:
        result = os.popen(f'netstat -nlp|grep {port} |tr -s " "').readlines()
        flag = f':{port}'
        res = [line.strip() for line in result if flag in line]
        logger.debug(res[0])
        p = res[0].split(' ')
        pp = p[3].split(':')[-1]
        if str(port) == pp:
            pid = p[p.index('LISTEN') + 1].split('/')[0]
    except Exception as err:
        logger.error(err)

    return pid


def notification(msg=None):
    """
    发送邮件通知
    :param msg: 邮件正文信息
    :return:
    """
    url = f'http://{cfg.getMaster("host")}:{cfg.getMaster("port")}/Notification'

    header = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json; charset=UTF-8"}

    post_data = {
        'host': cfg.getServer('host'),
        'msg': msg
    }

    try:
        res = requests.post(url=url, json=post_data, headers=header)
        if res.status_code == 200:
            logger.info('邮件发送成功')
        else:
            logger.error('邮件发送失败')
    except Exception as err:
        logger.error(f'邮件发送失败，失败详情：{err}')
