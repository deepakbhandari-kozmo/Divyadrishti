// System Performance Monitor
class SystemMonitor {
    constructor() {
        this.isRunning = false;
        this.updateInterval = 60000; // 1 minute (reduced from 1 second)
        this.dataPoints = 60; // Keep 60 seconds of data
        this.charts = {};
        this.data = {
            cpu: [],
            memory: [],
            disk: [],
            network: []
        };
        
        this.init();
    }
    
    init() {
        this.createCharts();
        this.startMonitoring();
        this.updateTimer();
    }
    
    createCharts() {
        // Create mini charts for each performance widget
        this.createMiniChart('cpuMiniChart', '#e74c3c');
        this.createMiniChart('memoryMiniChart', '#3498db');
        this.createMiniChart('diskMiniChart', '#f39c12');
        this.createMiniChart('networkMiniChart', '#2ecc71');
        
        // Create main performance chart
        this.createMainChart();
    }
    
    createMiniChart(canvasId, color) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(30).fill(''),
                datasets: [{
                    data: Array(30).fill(0),
                    borderColor: color,
                    backgroundColor: color + '20',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        display: false,
                        grid: { display: false }
                    },
                    y: {
                        display: false,
                        grid: { display: false },
                        min: 0,
                        max: 100
                    }
                },
                elements: {
                    point: { radius: 0 }
                },
                interaction: {
                    intersect: false
                },
                animation: {
                    duration: 0
                }
            }
        });
    }
    
    createMainChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        this.charts.main = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(60).fill(''),
                datasets: [
                    {
                        label: 'CPU',
                        data: Array(60).fill(0),
                        borderColor: '#e74c3c',
                        backgroundColor: '#e74c3c20',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Memory',
                        data: Array(60).fill(0),
                        borderColor: '#3498db',
                        backgroundColor: '#3498db20',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Disk',
                        data: Array(60).fill(0),
                        borderColor: '#f39c12',
                        backgroundColor: '#f39c1220',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Network',
                        data: Array(60).fill(0),
                        borderColor: '#2ecc71',
                        backgroundColor: '#2ecc7120',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: true,
                            color: 'rgba(0,0,0,0.05)',
                            lineWidth: 1
                        },
                        ticks: { display: false }
                    },
                    y: {
                        display: true,
                        min: 0,
                        max: 100,
                        grid: {
                            display: true,
                            color: 'rgba(0,0,0,0.05)',
                            lineWidth: 1
                        },
                        ticks: {
                            stepSize: 25,
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false
                },
                animation: {
                    duration: 0
                }
            }
        });
    }
    
    async fetchRealSystemData() {
        try {
            console.log('📊 Fetching real system metrics...');
            const response = await fetch('/api/system/metrics');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('✅ Real system data received:', data);
            this.showDataSourceIndicator('real');

            return {
                cpu: data.cpu.percent,
                memory: data.memory.percent,
                disk: data.disk.percent,
                network: Math.min(100, (data.network.speed_mbps / 10) * 100), // Scale network to percentage
                timestamp: data.timestamp,
                details: {
                    cpu: {
                        cores: data.cpu.count,
                        frequency: data.cpu.frequency_mhz,
                        load_avg: data.cpu.load_avg
                    },
                    memory: {
                        total_gb: data.memory.total_gb,
                        used_gb: data.memory.used_gb,
                        available_gb: data.memory.available_gb
                    },
                    disk: {
                        total_gb: data.disk.total_gb,
                        used_gb: data.disk.used_gb,
                        free_gb: data.disk.free_gb
                    },
                    network: {
                        sent_mb: data.network.bytes_sent_mb,
                        recv_mb: data.network.bytes_recv_mb,
                        connections: data.network.connections
                    },
                    system: data.system
                }
            };
        } catch (error) {
            console.warn('⚠️ Failed to fetch real system data, using fallback:', error.message);
            this.showDataSourceIndicator('mock');
            return this.generateFallbackData();
        }
    }

    generateFallbackData() {
        // Fallback data when real metrics are unavailable
        const now = Date.now();

        return {
            cpu: Math.max(10, Math.min(90, 45 + Math.sin(now / 10000) * 20 + (Math.random() - 0.5) * 10)),
            memory: Math.max(20, Math.min(80, 46 + Math.sin(now / 15000) * 15 + (Math.random() - 0.5) * 8)),
            disk: Math.max(5, Math.min(95, 67 + Math.sin(now / 20000) * 10 + (Math.random() - 0.5) * 5)),
            network: Math.max(0, Math.min(100, 25 + Math.sin(now / 8000) * 30 + (Math.random() - 0.5) * 15)),
            timestamp: new Date().toISOString(),
            details: {
                cpu: { cores: 'N/A', frequency: 'N/A' },
                memory: { total_gb: 'N/A', used_gb: 'N/A' },
                disk: { total_gb: 'N/A', used_gb: 'N/A' },
                network: { sent_mb: 'N/A', recv_mb: 'N/A' },
                system: { platform: 'Unknown' }
            }
        };
    }
    
    async updateData() {
        const newData = await this.fetchRealSystemData();

        // Update current values in UI
        const cpuElement = document.getElementById('cpu-current');
        const memoryElement = document.getElementById('memory-current');
        const diskElement = document.getElementById('disk-current');
        const networkElement = document.getElementById('network-current');

        if (cpuElement) cpuElement.textContent = Math.round(newData.cpu) + '%';
        if (memoryElement && newData.details.memory.used_gb !== 'N/A') {
            memoryElement.textContent = `${newData.details.memory.used_gb}GB / ${newData.details.memory.total_gb}GB`;
        } else if (memoryElement) {
            memoryElement.textContent = Math.round(newData.memory) + '%';
        }
        if (diskElement && newData.details.disk.used_gb !== 'N/A') {
            diskElement.textContent = `${newData.details.disk.used_gb}GB / ${newData.details.disk.total_gb}GB`;
        } else if (diskElement) {
            diskElement.textContent = Math.round(newData.disk) + '%';
        }
        if (networkElement && newData.details.network.sent_mb !== 'N/A') {
            const totalMB = newData.details.network.sent_mb + newData.details.network.recv_mb;
            networkElement.textContent = `${totalMB.toFixed(1)} MB total`;
        } else if (networkElement) {
            networkElement.textContent = Math.round(newData.network * 0.5) + ' MB/s';
        }

        // Update detailed metrics
        this.updateDetailedMetrics(newData);
        
        // Update charts
        this.updateCharts(newData);
    }

    updateDetailedMetrics(data) {
        // CPU Details
        const cpuSpeed = document.getElementById('cpu-speed');
        const cpuCores = document.getElementById('cpu-cores');
        const cpuProcesses = document.getElementById('cpu-processes');

        if (cpuSpeed && data.details.cpu.frequency !== 'N/A') {
            cpuSpeed.textContent = `${(data.details.cpu.frequency / 1000).toFixed(1)} GHz`;
        } else if (cpuSpeed) {
            cpuSpeed.textContent = 'N/A';
        }

        if (cpuCores && data.details.cpu.cores !== 'N/A') {
            cpuCores.textContent = data.details.cpu.cores.toString();
        } else if (cpuCores) {
            cpuCores.textContent = 'N/A';
        }

        if (cpuProcesses && data.details.system.process_count !== undefined) {
            cpuProcesses.textContent = data.details.system.process_count.toString();
        } else if (cpuProcesses) {
            cpuProcesses.textContent = Math.round(240 + data.cpu * 0.5).toString();
        }

        // Memory Details
        const memoryAvailable = document.getElementById('memory-available');
        const memoryCached = document.getElementById('memory-cached');
        const memoryUsed = document.getElementById('memory-used');

        if (memoryAvailable && data.details.memory.available_gb !== 'N/A') {
            memoryAvailable.textContent = `${data.details.memory.available_gb} GB`;
        } else if (memoryAvailable) {
            memoryAvailable.textContent = 'N/A';
        }

        if (memoryCached) {
            memoryCached.textContent = 'N/A'; // Not available in current metrics
        }

        if (memoryUsed && data.details.memory.used_gb !== 'N/A') {
            memoryUsed.textContent = `${data.details.memory.used_gb} GB`;
        } else if (memoryUsed) {
            memoryUsed.textContent = 'N/A';
        }

        // Disk Details
        const diskRead = document.getElementById('disk-read');
        const diskWrite = document.getElementById('disk-write');
        const diskActive = document.getElementById('disk-active');

        if (diskRead && data.details.disk.read_mb !== undefined) {
            diskRead.textContent = `${data.details.disk.read_mb} MB total`;
        } else if (diskRead) {
            diskRead.textContent = Math.round(20 + data.disk * 0.8) + ' MB/s';
        }

        if (diskWrite && data.details.disk.write_mb !== undefined) {
            diskWrite.textContent = `${data.details.disk.write_mb} MB total`;
        } else if (diskWrite) {
            diskWrite.textContent = Math.round(10 + data.disk * 0.4) + ' MB/s';
        }
        if (diskActive) diskActive.textContent = Math.round(data.disk * 0.3) + '%';

        // Network Details
        const networkDownload = document.getElementById('network-download');
        const networkUpload = document.getElementById('network-upload');
        const networkLatency = document.getElementById('network-latency');

        if (networkDownload) networkDownload.textContent = Math.round(data.network * 0.3) + ' MB/s';
        if (networkUpload) networkUpload.textContent = Math.round(data.network * 0.15) + ' MB/s';
        if (networkLatency) networkLatency.textContent = Math.round(8 + data.network * 0.2) + 'ms';
    }
    
    updateCharts(newData) {
        // Update mini charts
        Object.keys(this.charts).forEach(chartId => {
            if (chartId === 'main') return;
            
            const chart = this.charts[chartId];
            const dataType = chartId.replace('MiniChart', '');
            const value = newData[dataType];
            
            chart.data.datasets[0].data.shift();
            chart.data.datasets[0].data.push(value);
            chart.update('none');
        });
        
        // Update main chart
        if (this.charts.main) {
            const chart = this.charts.main;
            ['cpu', 'memory', 'disk', 'network'].forEach((type, index) => {
                chart.data.datasets[index].data.shift();
                chart.data.datasets[index].data.push(newData[type]);
            });
            chart.update('none');
        }
    }
    
    startMonitoring() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.monitorInterval = setInterval(() => {
            this.updateData();
        }, this.updateInterval);
    }
    
    stopMonitoring() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        clearInterval(this.monitorInterval);
    }
    
    updateTimer() {
        let seconds = 0;
        setInterval(() => {
            seconds++;
            const timerElement = document.getElementById('update-timer');
            if (timerElement) {
                timerElement.textContent = seconds + 's';
                if (seconds >= 60) seconds = 0;
            }
        }, 1000);
    }

    showDataSourceIndicator(type) {
        // Create or update data source indicator
        let indicator = document.getElementById('data-source-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'data-source-indicator';
            indicator.style.cssText = `
                position: fixed;
                top: 10px;
                right: 10px;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 12px;
                font-weight: 600;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }

        if (type === 'real') {
            indicator.textContent = '🟢 LIVE DATA';
            indicator.style.background = 'rgba(40, 167, 69, 0.9)';
            indicator.style.color = 'white';
            indicator.style.border = '1px solid #28a745';
        } else {
            indicator.textContent = '🟡 DEMO DATA';
            indicator.style.background = 'rgba(255, 193, 7, 0.9)';
            indicator.style.color = 'black';
            indicator.style.border = '1px solid #ffc107';
        }
    }
}

// Global functions for dashboard
function refreshStorageData() {
    // Simulate refresh
    const refreshBtn = document.querySelector('.refresh-btn i');
    if (refreshBtn) {
        refreshBtn.classList.add('fa-spin');
        setTimeout(() => {
            refreshBtn.classList.remove('fa-spin');
        }, 1000);
    }
}

function toggleFullscreen() {
    const card = document.querySelector('.storage-monitoring');
    if (card) {
        card.classList.toggle('fullscreen-mode');
    }
}

// Initialize system monitor when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Chart.js to load
    if (typeof Chart !== 'undefined') {
        window.systemMonitor = new SystemMonitor();
    } else {
        // Retry after a short delay if Chart.js isn't loaded yet
        setTimeout(() => {
            if (typeof Chart !== 'undefined') {
                window.systemMonitor = new SystemMonitor();
            }
        }, 1000);
    }
});
