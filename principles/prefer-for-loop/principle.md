# Prefer a for-loop over forEach

Write a plain for loop instead of forEach, because forEach allocates an unnecessary lambda; for transformations use map, flatMap or reduce.

Usually, use map/flatMap/reduce to work with Iterables. But do avoid forEach, because it allocates an unnecessary lambda. Instead use a normal for-loop.
