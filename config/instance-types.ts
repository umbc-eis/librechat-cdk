export const documentDbInstanceTypes = [
    // Graviton (ARM-based) - Best price-performance (up to 40% better than x86)
    { name: 't4g.medium (2 vCPU, 4 GiB RAM) - Dev/Test - Graviton', value: 't4g.medium' },
    { name: 'r6g.large (2 vCPU, 16 GiB RAM) - Production - Graviton', value: 'r6g.large' },
    { name: 'r6g.xlarge (4 vCPU, 32 GiB RAM) - Production - Graviton', value: 'r6g.xlarge' },
    { name: 'r7g.large (2 vCPU, 16 GiB RAM) - Latest Gen - Graviton3', value: 'r7g.large' },
    { name: 'r7g.xlarge (4 vCPU, 32 GiB RAM) - Latest Gen - Graviton3', value: 'r7g.xlarge' },
    
    // x86 instances (if you need x86 compatibility)
    { name: 't3.medium (2 vCPU, 4 GiB RAM) - Dev/Test - x86', value: 't3.medium' },
    { name: 'r6i.large (2 vCPU, 16 GiB RAM) - Production - x86', value: 'r6i.large' },
    { name: 'r6i.xlarge (4 vCPU, 32 GiB RAM) - Production - x86', value: 'r6i.xlarge' },
    { name: 'r7i.large (2 vCPU, 16 GiB RAM) - Latest Gen - x86', value: 'r7i.large' }
];