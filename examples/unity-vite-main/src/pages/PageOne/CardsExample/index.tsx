import { Column, Grid, H3 } from '@abbvie-unity/react';
import CardExample from './CardExample';

const CardsExample = () => {
  return (
    <Grid className="gap-y-6">
      {/* ROW 1 */}
      <Column span="100%" className="flex flex-col gap-y-4">
        <H3>Row 1</H3>
        <Grid className="gap-y-(--unity-grid-gutter)">
          <Column sm={4}>
            <CardExample />
          </Column>
          <Column sm={4}>
            <CardExample />
          </Column>
          <Column sm={4}>
            <CardExample />
          </Column>
          <Column sm={4}>
            <CardExample />
          </Column>
        </Grid>
      </Column>

      {/* ROW 2 */}
      <Column span="100%" className="flex flex-col gap-y-4">
        <H3>Row 2</H3>
        <Grid className="gap-y-(--unity-grid-gutter)">
          <Column sm={4} lg={8}>
            <CardExample />
          </Column>
          <Column sm={4} lg={8}>
            <CardExample />
          </Column>
        </Grid>
      </Column>

      {/* ROW 3 */}
      <Column span="100%" className="flex flex-col gap-y-4">
        <H3>Row 3</H3>
        <Grid className="gap-y-(--unity-grid-gutter)">
          <Column span="100%">
            <CardExample />
          </Column>
        </Grid>
      </Column>
    </Grid>
  );
};

export default CardsExample;
