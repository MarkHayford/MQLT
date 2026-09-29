--
-- PostgreSQL database dump
--


-- Dumped from database version 13.23
-- Dumped by pg_dump version 13.23

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: CommunityComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommunityComment" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CommunityLike; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommunityLike" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: CommunityPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."CommunityPost" (
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


--
-- Name: ConsoleAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ConsoleAccount" (
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


--
-- Name: EnterprisePayoutAccount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EnterprisePayoutAccount" (
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


--
-- Name: EnterpriseWithdraw; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EnterpriseWithdraw" (
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


--
-- Name: UserCoupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserCoupon" (
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


--
-- Name: CommunityComment CommunityComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityComment"
    ADD CONSTRAINT "CommunityComment_pkey" PRIMARY KEY (id);


--
-- Name: CommunityLike CommunityLike_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityLike"
    ADD CONSTRAINT "CommunityLike_pkey" PRIMARY KEY (id);


--
-- Name: CommunityLike CommunityLike_userId_postId_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityLike"
    ADD CONSTRAINT "CommunityLike_userId_postId_key" UNIQUE ("userId", "postId");


--
-- Name: CommunityPost CommunityPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityPost"
    ADD CONSTRAINT "CommunityPost_pkey" PRIMARY KEY (id);


--
-- Name: ConsoleAccount ConsoleAccount_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsoleAccount"
    ADD CONSTRAINT "ConsoleAccount_phone_key" UNIQUE (phone);


--
-- Name: ConsoleAccount ConsoleAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsoleAccount"
    ADD CONSTRAINT "ConsoleAccount_pkey" PRIMARY KEY (id);


--
-- Name: EnterprisePayoutAccount EnterprisePayoutAccount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EnterprisePayoutAccount"
    ADD CONSTRAINT "EnterprisePayoutAccount_pkey" PRIMARY KEY (id);


--
-- Name: EnterpriseWithdraw EnterpriseWithdraw_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EnterpriseWithdraw"
    ADD CONSTRAINT "EnterpriseWithdraw_pkey" PRIMARY KEY (id);


--
-- Name: UserCoupon UserCoupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserCoupon"
    ADD CONSTRAINT "UserCoupon_pkey" PRIMARY KEY (id);


--
-- Name: CommunityPost_channel_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "CommunityPost_channel_created_idx" ON public."CommunityPost" USING btree (channel, status, "createdAt" DESC);


--
-- Name: ConsoleAccount_enterpriseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ConsoleAccount_enterpriseId_idx" ON public."ConsoleAccount" USING btree ("enterpriseId");


--
-- Name: UserCoupon_userId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "UserCoupon_userId_status_idx" ON public."UserCoupon" USING btree ("userId", status, "createdAt" DESC);


--
-- Name: CommunityComment CommunityComment_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityComment"
    ADD CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."CommunityPost"(id) ON DELETE CASCADE;


--
-- Name: CommunityComment CommunityComment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityComment"
    ADD CONSTRAINT "CommunityComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: CommunityLike CommunityLike_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityLike"
    ADD CONSTRAINT "CommunityLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."CommunityPost"(id) ON DELETE CASCADE;


--
-- Name: CommunityLike CommunityLike_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityLike"
    ADD CONSTRAINT "CommunityLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: CommunityPost CommunityPost_projectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityPost"
    ADD CONSTRAINT "CommunityPost_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES public."StudyProject"(id) ON DELETE SET NULL;


--
-- Name: CommunityPost CommunityPost_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."CommunityPost"
    ADD CONSTRAINT "CommunityPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- Name: ConsoleAccount ConsoleAccount_enterpriseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ConsoleAccount"
    ADD CONSTRAINT "ConsoleAccount_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES public."Enterprise"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserCoupon UserCoupon_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserCoupon"
    ADD CONSTRAINT "UserCoupon_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--


