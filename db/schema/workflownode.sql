CREATE TABLE workflownode (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workflowId uuid NOT NULL,
    type workflownode_types NOT NULL, -- Node types like -> send_message, new_ticket, etc.
    isTrigger boolean NOT NULL,
    positionX int2 NOT NULL,
    positionY int2 NOT NULL,
    reactFlowId text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    createdAt timestamptz DEFAULT now(),

    CONSTRAINT workflownode_workflowId_fkey FOREIGN KEY (workflowId)
        REFERENCES public.workflow(id)
);
