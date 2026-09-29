-- Overlay tables used by the baked production dist but not present in prisma/schema.prisma.
-- Safe to re-run (IF NOT EXISTS / duplicate_object handlers).
CREATE TABLE IF NOT EXISTS public."CommunityPost" (
    id text NOT NULL,
    "userId" text NOT NULL,
    title text NOT NULL,
    content text DEFAULT ''::text NOT NULL,
    "coverUrl" text DEFAULT ''::text NOT NULL,
    images text DEFAULT '[]'::text NOT NULL,
    "videoUrl" text DEFAULT ''::text NOT NULL,
    channel text DEFAULT 'experience'::text NOT NULL,
    type text DEFAULT '研学体验'::text NOT NULL,
    "projectId" text,
    "likeCount" integer DEFAULT 0 NOT NULL,
    "commentCount" integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    category text DEFAULT '测试分类'::text NOT NULL,
    "reviewNote" text,
    "reviewedAt" timestamp without time zone,
    publisher text,
    "publisherUnitType" text,
    "publisherUnitId" text,
    "enterpriseId" text
);
CREATE TABLE IF NOT EXISTS public."CommunityLike" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS public."CommunityComment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS public."ConsoleAccount" (
    id text NOT NULL,
    phone text NOT NULL,
    "passwordHash" text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    "mpAccess" boolean DEFAULT false NOT NULL,
    "mpRole" text DEFAULT 'NONE'::text NOT NULL,
    "merchantAccess" boolean DEFAULT false NOT NULL,
    "enterpriseId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "merchantRoleId" text,
    email text,
    "avatarUrl" text
);
CREATE TABLE IF NOT EXISTS public."EnterprisePayoutAccount" (
    id text NOT NULL,
    "enterpriseId" text NOT NULL,
    label text,
    "bankName" text NOT NULL,
    "accountName" text NOT NULL,
    "accountNo" text NOT NULL,
    "isDefault" boolean DEFAULT false,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public."EnterpriseWithdraw" (
    id text NOT NULL,
    "enterpriseId" text NOT NULL,
    "accountId" text,
    amount numeric(12,2) NOT NULL,
    status text DEFAULT 'PENDING'::text,
    "bankName" text,
    "accountName" text,
    "accountNo" text,
    note text,
    "reviewNote" text,
    "reviewedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now(),
    "updatedAt" timestamp without time zone DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public."UserCoupon" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "couponId" text,
    title text NOT NULL,
    subtitle text DEFAULT ''::text NOT NULL,
    type text DEFAULT 'cash'::text NOT NULL,
    value text DEFAULT '0'::text NOT NULL,
    "minAmount" text DEFAULT '0'::text NOT NULL,
    status text DEFAULT 'unused'::text NOT NULL,
    "expireAt" timestamp(3) without time zone,
    "usedAt" timestamp(3) without time zone,
    source text DEFAULT ''::text NOT NULL,
    scope text DEFAULT '文创商城'::text NOT NULL,
    "orderId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "productId" text,
    "projectId" text,
    "routePointId" text,
    "bookingId" text,
    grade text
);

DO $$ BEGIN ALTER TABLE ONLY public."CommunityPost" ADD CONSTRAINT "CommunityPost_pkey" PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."CommunityLike" ADD CONSTRAINT "CommunityLike_pkey" PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."CommunityLike" ADD CONSTRAINT "CommunityLike_userId_postId_key" UNIQUE ("userId", "postId"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."CommunityComment" ADD CONSTRAINT "CommunityComment_pkey" PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."ConsoleAccount" ADD CONSTRAINT "ConsoleAccount_pkey" PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."ConsoleAccount" ADD CONSTRAINT "ConsoleAccount_phone_key" UNIQUE (phone); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."EnterprisePayoutAccount" ADD CONSTRAINT "EnterprisePayoutAccount_pkey" PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."EnterpriseWithdraw" ADD CONSTRAINT "EnterpriseWithdraw_pkey" PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."UserCoupon" ADD CONSTRAINT "UserCoupon_pkey" PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "CommunityPost_channel_created_idx" ON public."CommunityPost" USING btree (channel, status, "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "ConsoleAccount_enterpriseId_idx" ON public."ConsoleAccount" USING btree ("enterpriseId");
CREATE INDEX IF NOT EXISTS "UserCoupon_userId_status_idx" ON public."UserCoupon" USING btree ("userId", status, "createdAt" DESC);

DO $$ BEGIN ALTER TABLE ONLY public."CommunityComment" ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."CommunityPost"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."CommunityComment" ADD CONSTRAINT "CommunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."CommunityLike" ADD CONSTRAINT "CommunityLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."CommunityPost"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."CommunityLike" ADD CONSTRAINT "CommunityLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."CommunityPost" ADD CONSTRAINT "CommunityPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."StudyProject"(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."CommunityPost" ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."ConsoleAccount" ADD CONSTRAINT "ConsoleAccount_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES public."Enterprise"(id) ON UPDATE CASCADE ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ONLY public."UserCoupon" ADD CONSTRAINT "UserCoupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
