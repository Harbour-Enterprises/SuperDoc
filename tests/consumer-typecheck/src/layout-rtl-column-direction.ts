import type { Layout } from 'superdoc';

// `Layout.columns` is a `ColumnLayout`, and the section page direction (`w:sectPr/w:bidi`) travels
// on it because column geometry is what the axis decides: which side the FIRST column sits on.
// The field is reachable from outside the package through this nested shape, so it is pinned here.

type PublicColumnLayout = NonNullable<Layout['columns']>;
type PublicColumnDirection = NonNullable<PublicColumnLayout['direction']>;

// Both literals a section can carry have to be assignable from outside the package.
const rtlSection: PublicColumnLayout = { count: 2, gap: 48, direction: 'rtl' };
const ltrSection: PublicColumnLayout = { count: 2, gap: 48, direction: 'ltr' };

// Absent means LTR, so a consumer that never heard of the axis must still type-check.
const directionless: PublicColumnLayout = { count: 2, gap: 48 };

// The field is optional, and reading it back yields the same union — no widening to `string`.
declare const layout: Layout;
const readDirection: PublicColumnDirection | undefined = layout.columns?.direction;

const rtl: PublicColumnDirection = 'rtl';
const ltr: PublicColumnDirection = 'ltr';

// A consumer must be able to hand a value it read straight back into a layout it builds.
declare const observed: PublicColumnDirection;
const roundTripped: PublicColumnLayout = { count: 3, gap: 24, direction: observed };

void rtlSection;
void ltrSection;
void directionless;
void readDirection;
void rtl;
void ltr;
void roundTripped;

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type AssertEqual<T extends true> = T;
type PublicResumeCheckpoint = NonNullable<ReturnType<NonNullable<Layout['blockResumeCheckpoints']>['get']>>;

const pageStartShape: AssertEqual<
  Equal<Layout['pageStartColumns'], ReadonlyMap<number, PublicColumnLayout> | undefined>
> = true;
const checkpointShape: AssertEqual<Equal<PublicResumeCheckpoint['activeColumns'], PublicColumnLayout | undefined>> =
  true;

const omittedPageSeeds: Pick<Layout, 'pageStartColumns'> = {};
const omittedBlockSeed: Pick<PublicResumeCheckpoint, 'activeColumns'> = {};
const pageSeeds: Pick<Layout, 'pageStartColumns'> = {
  pageStartColumns: new Map<number, PublicColumnLayout>([[0, rtlSection]]),
};
const blockSeed: Pick<PublicResumeCheckpoint, 'activeColumns'> = { activeColumns: ltrSection };
const readPageSeed: PublicColumnLayout | undefined = layout.pageStartColumns?.get(0);
const readBlockSeed: PublicColumnLayout | undefined = layout.blockResumeCheckpoints?.get('paragraph')?.activeColumns;
const roundTrippedSeeds: Pick<Layout, 'pageStartColumns'> = {
  pageStartColumns: readPageSeed ? new Map([[0, readPageSeed]]) : undefined,
};
const roundTrippedBlockSeed: Pick<PublicResumeCheckpoint, 'activeColumns'> = { activeColumns: readBlockSeed };

void pageStartShape;
void checkpointShape;
void omittedPageSeeds;
void omittedBlockSeed;
void pageSeeds;
void blockSeed;
void readPageSeed;
void readBlockSeed;
void roundTrippedSeeds;
void roundTrippedBlockSeed;
