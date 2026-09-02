export function requestLogTableSpinning(input: {
    isLoading: boolean;
    isFetching: boolean;
    userInitiated: boolean;
}): boolean {
    return input.isLoading || input.userInitiated;
}
