type AssertEqual<T, U> = (<X>() => X extends T ? 1 : 0) extends <Y>() => Y extends U ? 1 : 0 ? true : false;
export const assertEqual = <A, B>(val: AssertEqual<A, B>) => val;
