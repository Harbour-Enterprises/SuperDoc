import { Card, CardBody, H3, Typography } from '@abbvie-unity/react';

const CardExample = () => {
  return (
    <Card>
      <CardBody>
        <H3>Card Title</H3>
        <Typography>
          Use supporting text for any additional information that adds clarity
          or prompts action, like an article summary or place description.
        </Typography>
      </CardBody>
    </Card>
  );
};

export default CardExample;
