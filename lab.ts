// Two Sum
function f(nums: number[], target: number): [number,number] {
    let i = 0;
    let j = 0;
    for (i = 0; i < nums.length; i++) {
        const a = nums[i];
        for (j = i + 1; j < nums.length; j++) {
            const b = nums[j];
            if ((a + b) === target) {
                return [i,j];
            } 
        }
    }
    return [0,0];
}

// console.log(f([2,7,11,15], 9));
// console.log(f([3,2,4], 6));
// console.log(f([3,3], 6));

function twoSum(nums: number[], target: number): [number, number] {
    const map: Record<number, number> = {};
    let i = 0;
    while (i < nums.length) {
        const complement = target - nums[i];
        if (map[complement] !== undefined) {
            return [map[complement], i];
        }
        map[nums[i]] = i;
        i++;
    }
    return [0,0];
}


console.log(twoSum([2,7,11,15], 9));
console.log(twoSum([3,2,4], 6));
console.log(twoSum([3,3], 6));