import {
  ActionFromMatcher,
  hasMatchFunction,
  Matcher,
  UnionToIntersection
} from './tsHelpers'
import {
  AsyncThunk,
  AsyncThunkFulfilledActionCreator,
  AsyncThunkPendingActionCreator,
  AsyncThunkRejectedActionCreator
} from './createAsyncThunk'

/** @public */
export type ActionMatchingAnyOf<
  Matchers extends [Matcher<any>, ...Matcher<any>[]]
> = ActionFromMatcher<Matchers[number]>

/** @public */
export type ActionMatchingAllOf<
  Matchers extends [Matcher<any>, ...Matcher<any>[]]
> = UnionToIntersection<ActionMatchingAnyOf<Matchers>>

const matches = (matcher: Matcher<any>, action: any) => {
  if (hasMatchFunction(matcher)) {
    return matcher.match(action)
  } else {
    return matcher(action)
  }
}

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action matches any one of the supplied type guards or action
 * creators.
 *
 * @param matchers The type guards or action creators to match against.
 *
 * @public
 */
export function isAnyOf<Matchers extends [Matcher<any>, ...Matcher<any>[]]>(
  ...matchers: Matchers
) {
  return (action: any): action is ActionMatchingAnyOf<Matchers> => {
    return matchers.some(matcher => matches(matcher, action))
  }
}

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action matches all of the supplied type guards or action
 * creators.
 *
 * @param matchers The type guards or action creators to match against.
 *
 * @public
 */
export function isAllOf<Matchers extends [Matcher<any>, ...Matcher<any>[]]>(
  ...matchers: Matchers
) {
  return (action: any): action is ActionMatchingAllOf<Matchers> => {
    return matchers.every(matcher => matches(matcher, action))
  }
}

/**
 * @internal
 *
 * @param action
 * @param validStatus
 */
export function hasExpectedRequestMetadata(action: any, validStatus: string[]) {
  if (!action || !action.meta) return false

  const hasValidRequestId = typeof action.meta.requestId === 'string'
  const hasValidRequestStatus =
    validStatus.indexOf(action.meta.requestStatus) > -1

  return hasValidRequestId && hasValidRequestStatus
}

export type UnknownAsyncThunkPendingAction = ReturnType<
  AsyncThunkPendingActionCreator<unknown>
>

/**
 * @public
 *
 * @param action
 */
export function isPending(
  action: any
): action is UnknownAsyncThunkPendingAction {
  return hasExpectedRequestMetadata(action, ['pending'])
}

export type UnknownAsyncThunkRejectedAction = ReturnType<
  AsyncThunkRejectedActionCreator<unknown, unknown>
>

/**
 * @public
 *
 * @param action
 */
export function isRejected(
  action: any
): action is UnknownAsyncThunkRejectedAction {
  return hasExpectedRequestMetadata(action, ['rejected'])
}

export type UnknownAsyncThunkFulfilledAction = ReturnType<
  AsyncThunkFulfilledActionCreator<unknown, unknown>
>

/**
 * @public
 *
 * @param action
 */
export function isFulfilled(
  action: any
): action is UnknownAsyncThunkFulfilledAction {
  return hasExpectedRequestMetadata(action, ['fulfilled'])
}

export type UnknownAsyncThunkAction =
  | UnknownAsyncThunkPendingAction
  | UnknownAsyncThunkRejectedAction
  | UnknownAsyncThunkFulfilledAction

/**
 * @internal
 *
 * @param action
 */
export function isAnyAsyncThunkAction(
  action: any
): action is UnknownAsyncThunkAction {
  return hasExpectedRequestMetadata(action, [
    'pending',
    'fulfilled',
    'rejected'
  ])
}

export type AnyAsyncThunk = AsyncThunk<any, any, any>

export type ActionsFromAsyncThunk<T extends AnyAsyncThunk> =
  | ActionFromMatcher<T['pending']>
  | ActionFromMatcher<T['fulfilled']>
  | ActionFromMatcher<T['rejected']>

/**
 * A higher-order function that returns a function that may be used to check
 * whether an action belongs to one of the provided async thunk action creators.
 *
 * @param asyncThunks The async thunk action creators to match against.
 *
 * @public
 */
export function isAsyncThunkAction(): (
  action: any
) => action is UnknownAsyncThunkAction
export function isAsyncThunkAction<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(
  ...asyncThunks: AsyncThunks
): (action: any) => action is ActionsFromAsyncThunk<AsyncThunks[number]>
export function isAsyncThunkAction<
  AsyncThunks extends [AnyAsyncThunk, ...AnyAsyncThunk[]]
>(...asyncThunks: AsyncThunks) {
  if (asyncThunks.length === 0) {
    return isAnyAsyncThunkAction
  }

  return (
    action: any
  ): action is ActionsFromAsyncThunk<AsyncThunks[number]> => {
    const [firstAsyncThunk, ...restAsyncThunks] = asyncThunks

    const matchers: [Matcher<any>, ...Matcher<any>[]] = [
      firstAsyncThunk.pending,
      firstAsyncThunk.rejected,
      firstAsyncThunk.fulfilled
    ]

    for (const asyncThunk of restAsyncThunks) {
      matchers.push(
        asyncThunk.pending,
        asyncThunk.rejected,
        asyncThunk.fulfilled
      )
    }

    const combinedMatcher = isAllOf(isAnyAsyncThunkAction, isAnyOf(...matchers))
    return combinedMatcher(action)
  }
}
